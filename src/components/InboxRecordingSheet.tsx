import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Mic, Brain, FileText, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FolderSelector } from "@/components/FolderSelector";
import { FolderModal } from "@/components/FolderModal";
import { VisibilitySelector } from "@/components/VisibilitySelector";
import { ShareRecipientPicker } from "@/components/ShareRecipientPicker";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { MemoVisibility, ShareRecipient } from "@/hooks/useMemoSharing";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ReplyToMemo {
  id: string;
  title: string;
  author_id?: string | null;
  author_name?: string;
}

interface InboxRecordingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: ReplyToMemo | null;
  onComplete?: () => void;
}

const PROCESSING_STEPS = [
  { key: "saving", label: "Saving memo", icon: FileText },
] as const;

type ProcessingStep = "saving";

export function InboxRecordingSheet({ 
  isOpen, 
  onClose, 
  replyTo,
  onComplete 
}: InboxRecordingSheetProps) {
  const [step, setStep] = useState<"recording" | "details" | "processing">("recording");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<MemoVisibility>("private");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [shareRecipients, setShareRecipients] = useState<ShareRecipient[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("saving");
  
  // Recording state
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentDuration, setCurrentDuration] = useState(0);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState("auto");
  
  const { user } = useAuth();
  const { getDisplayName, getAvatarUrl } = useProfile();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("recording");
      setTitle("");
      setCurrentTranscript("");
      setCurrentDuration(0);
      setCurrentAudioBlob(null);
      setCurrentLanguage("auto");
      
      // If replying, auto-set visibility to shared and pre-add recipient
      if (replyTo && replyTo.author_id) {
        setVisibility("shared");
        setShareRecipients([{
          type: "user",
          id: replyTo.author_id,
          name: replyTo.author_name || "User"
        }]);
      } else {
        setVisibility("private");
        setShareRecipients([]);
      }
      setSelectedFolderId(null);
    }
  }, [isOpen, replyTo]);

  const handleRecordingComplete = (transcript: string, duration: number, audioBlob: Blob | null, language: string) => {
    if (duration < 1) {
      toast.error("Recording too short", {
        description: "Please record for at least 1 second.",
      });
      return;
    }
    
    setCurrentTranscript(transcript);
    setCurrentDuration(duration);
    setCurrentAudioBlob(audioBlob);
    setCurrentLanguage(language);
    setStep("details");
    
    if (!transcript.trim()) {
      toast.info("Processing your recording...", {
        description: "AI will transcribe and summarize your audio.",
      });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save memos");
      return;
    }
    
    // Validate shared visibility has recipients
    if (visibility === "shared" && shareRecipients.length === 0) {
      toast.error("Please select at least one person or group to share with");
      return;
    }
    
    setStep("processing");
    setProcessingStep("saving");
    
    try {
      // Upload audio file first (this is quick)
      let audioUrl: string | null = null;
      
      if (currentAudioBlob) {
        // Determine file extension based on blob MIME type
        const mimeType = currentAudioBlob.type || "audio/mp4";
        let extension = ".m4a"; // Default to m4a (iOS compatible)
        if (mimeType.includes("webm")) {
          extension = ".webm";
        } else if (mimeType.includes("mp4") || mimeType.includes("aac") || mimeType.includes("m4a")) {
          extension = ".m4a";
        } else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
          extension = ".mp3";
        } else if (mimeType.includes("wav")) {
          extension = ".wav";
        }
        console.log("Uploading audio with MIME:", mimeType, "extension:", extension);
        
        const fileName = `${user.id}/memo-${Date.now()}${extension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("audio-memos")
          .upload(fileName, currentAudioBlob, {
            contentType: mimeType,
          });

        if (uploadError) {
          console.error("Audio upload error:", uploadError);
          throw new Error("Failed to upload audio");
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("audio-memos")
            .getPublicUrl(uploadData.path);
          audioUrl = urlData.publicUrl;
        }
      }

      // Save memo immediately with pending status
      const { data: savedMemo, error: dbError } = await supabase
        .from("memos")
        .insert({
          user_id: user.id,
          title: title.trim() || "Voice Memo",
          transcript: currentTranscript || "Transcription in progress...",
          summary: "AI is analyzing your memo...",
          categories: ["Processing"],
          tasks: [],
          is_public: visibility === 'followers' || visibility === 'void',
          visibility: visibility,
          audio_url: audioUrl,
          duration: currentDuration,
          author_name: getDisplayName(),
          language: currentLanguage,
          folder_id: selectedFolderId || null,
          transcription_status: audioUrl ? 'pending' : 'completed',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create memo shares if visibility is 'shared'
      if (visibility === 'shared' && shareRecipients.length > 0) {
        const shareEntries = shareRecipients.map(recipient => ({
          memo_id: savedMemo.id,
          shared_with_user_id: recipient.type === 'user' ? recipient.id : null,
          shared_with_group_id: recipient.type === 'group' ? recipient.id : null,
          shared_by: user.id,
        }));

        await supabase.from('memo_shares').insert(shareEntries);
      }

      // Trigger background transcription (fire and forget)
      if (audioUrl) {
        supabase.functions.invoke("background-transcribe", {
          body: { 
            memo_id: savedMemo.id, 
            audio_url: audioUrl, 
            language: currentLanguage 
          },
        }).then(() => {
          console.log("Background transcription triggered");
        }).catch((err) => {
          console.error("Failed to trigger background transcription:", err);
        });
        
        toast.success(replyTo ? "Reply sent!" : "Memo saved!", {
          description: "AI transcription in progress (may take up to 5 min).",
        });
      } else {
        toast.success(replyTo ? "Reply sent!" : "Memo saved!");
      }
      
      onComplete?.();
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Save failed", {
        description: "Could not save memo. Please try again.",
      });
      setStep("details");
    }
  };

  const handleCreateFolder = async (data: { 
    name: string; 
    description?: string; 
    icon: string; 
    color: string; 
    is_public: boolean 
  }) => {
    setIsSavingFolder(true);
    try {
      const { data: newFolder, error } = await supabase
        .from("folders")
        .insert({ ...data, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      setSelectedFolderId(newFolder.id);
      setShowFolderModal(false);
      toast.success("Folder created");
    } catch (error) {
      console.error("Folder save error:", error);
      toast.error("Failed to create folder");
    } finally {
      setIsSavingFolder(false);
    }
  };

  const currentStepIndex = PROCESSING_STEPS.findIndex(s => s.key === processingStep);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && step !== "processing" && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <SheetTitle className="font-display text-xl">
                  {replyTo ? (
                    <span className="flex items-center gap-2">
                      <Reply className="h-5 w-5 text-primary" />
                      Reply to memo
                    </span>
                  ) : (
                    "New Recording"
                  )}
                </SheetTitle>
                {step !== "processing" && (
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
              {replyTo && (
                <p className="text-sm text-muted-foreground mt-1">
                  Replying to: <span className="font-medium text-foreground">{replyTo.title}</span>
                </p>
              )}
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {step === "recording" && (
                <div className="flex flex-col items-center justify-center min-h-[300px]">
                  <VoiceRecorder 
                    onRecordingComplete={handleRecordingComplete}
                  />
                </div>
              )}

              {step === "details" && (
                <div className="space-y-5">
                  {/* Transcript Preview */}
                  <div className="p-4 rounded-xl bg-muted/50 max-h-32 overflow-y-auto">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {currentTranscript ? "Transcript preview" : "Audio recorded"}
                    </p>
                    <p className="text-sm text-foreground">
                      {currentTranscript || "Your audio will be transcribed with AI after saving."}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Title (optional - AI will suggest one)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What's this about?"
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  {/* Folder Selector */}
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Folder
                    </Label>
                    <FolderSelector
                      selectedFolderId={selectedFolderId}
                      onSelectFolder={setSelectedFolderId}
                      onCreateNew={() => setShowFolderModal(true)}
                    />
                  </div>

                  {/* Visibility Selector */}
                  <VisibilitySelector 
                    value={visibility} 
                    onChange={setVisibility} 
                  />

                  {/* Share Recipients Picker */}
                  {visibility === "shared" && (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border">
                      <Label className="text-sm font-medium text-foreground mb-3 block">
                        Share with
                      </Label>
                      <ShareRecipientPicker
                        selectedRecipients={shareRecipients}
                        onChange={setShareRecipients}
                      />
                    </div>
                  )}

                  {/* Void explainer */}
                  {visibility === "void" && (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        ✨ Your memo will float into the universe for random listeners to discover.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === "processing" && (
                <div className="py-8">
                  {/* Progress steps */}
                  <div className="space-y-4 mb-8">
                    {PROCESSING_STEPS.map((s, index) => {
                      const Icon = s.icon;
                      const isActive = index === currentStepIndex;
                      const isComplete = index < currentStepIndex;
                      
                      return (
                        <div 
                          key={s.key}
                          className={cn(
                            "flex items-center gap-4 p-3 rounded-xl transition-all",
                            isActive && "bg-primary/10",
                            isComplete && "opacity-60"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isActive && "bg-primary",
                            isComplete && "bg-primary/20",
                            !isActive && !isComplete && "bg-muted"
                          )}>
                            {isActive ? (
                              <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
                            ) : isComplete ? (
                              <Icon className="h-5 w-5 text-primary" />
                            ) : (
                              <Icon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className={cn(
                              "font-medium",
                              isActive && "text-foreground",
                              (isComplete || (!isActive && !isComplete)) && "text-muted-foreground"
                            )}>
                              {s.label}
                            </p>
                            {isActive && (
                              <p className="text-xs text-muted-foreground animate-pulse">
                                {s.key === "saving" && "Saving your memo..."}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {step === "details" && (
              <div className="px-6 py-4 border-t border-border/50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep("recording")}>
                  Re-record
                </Button>
                <Button className="flex-1" onClick={handleSave}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {replyTo ? "Send Reply" : "Process & Save"}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Folder Creation Modal */}
      <FolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSave={handleCreateFolder}
        isLoading={isSavingFolder}
      />
    </>
  );
}
