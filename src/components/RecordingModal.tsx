import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Mic, Brain, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FolderSelector } from "@/components/FolderSelector";
import { FolderModal } from "@/components/FolderModal";
import { VisibilitySelector } from "@/components/VisibilitySelector";
import { ShareRecipientPicker } from "@/components/ShareRecipientPicker";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MemoVisibility, ShareRecipient } from "@/hooks/useMemoSharing";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    title: string; 
    visibility: MemoVisibility; 
    folderId: string | null;
    recipients?: ShareRecipient[];
  }) => void;
  isProcessing?: boolean;
  processingStep?: "transcribing" | "analyzing" | "saving";
  transcript?: string;
}

const PROCESSING_STEPS = [
  { key: "transcribing", label: "Transcribing audio", icon: Mic },
  { key: "analyzing", label: "AI summarizing", icon: Brain },
  { key: "saving", label: "Saving memo", icon: FileText },
] as const;

export function RecordingModal({ 
  isOpen, 
  onClose, 
  onSave, 
  isProcessing, 
  processingStep = "transcribing",
  transcript 
}: RecordingModalProps) {
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<MemoVisibility>("private");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [shareRecipients, setShareRecipients] = useState<ShareRecipient[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const { user } = useAuth();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setVisibility("private");
      setShareRecipients([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Validate shared visibility has recipients
    if (visibility === "shared" && shareRecipients.length === 0) {
      toast.error("Please select at least one person or group to share with");
      return;
    }
    
    onSave({ 
      title: title.trim(), 
      visibility, 
      folderId: selectedFolderId,
      recipients: visibility === "shared" ? shareRecipients : undefined,
    });
    setTitle("");
    setVisibility("private");
    setSelectedFolderId(null);
    setShareRecipients([]);
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
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <div 
          className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
          onClick={isProcessing ? undefined : onClose}
        />
        
        <div className="relative w-full max-w-lg glass-card rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-xl">
              {isProcessing ? "Processing Recording" : "Save Recording"}
            </h2>
            {!isProcessing && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {isProcessing ? (
            <div className="py-8">
              {/* Progress steps */}
              <div className="space-y-4 mb-8">
                {PROCESSING_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStepIndex;
                  const isComplete = index < currentStepIndex;
                  
                  return (
                    <div 
                      key={step.key}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-xl transition-all",
                        isActive && "bg-primary/10",
                        isComplete && "opacity-60"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isActive && "gradient-primary",
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
                          isComplete && "text-muted-foreground",
                          !isActive && !isComplete && "text-muted-foreground"
                        )}>
                          {step.label}
                        </p>
                        {isActive && (
                          <p className="text-xs text-muted-foreground animate-pulse">
                            {step.key === "transcribing" && "Using ElevenLabs AI..."}
                            {step.key === "analyzing" && "Extracting insights..."}
                            {step.key === "saving" && "Almost done..."}
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
                  className="h-full gradient-primary transition-all duration-500"
                  style={{ width: `${((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Transcript Preview */}
              <div className="mb-4 p-3 rounded-xl bg-muted/50 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {transcript ? "Transcript preview" : "Audio recorded"}
                </p>
                <p className="text-sm text-foreground">
                  {transcript || "Your audio will be transcribed with AI after saving."}
                </p>
              </div>

              <div className="space-y-4">
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

                {/* Visibility Selector - hidden in core features mode */}
                {!FEATURE_FLAGS.CORE_FEATURES_ONLY && (
                  <VisibilitySelector 
                    value={visibility} 
                    onChange={setVisibility} 
                  />
                )}

                {/* Share Recipients Picker - shown only when visibility is 'shared' */}
                {!FEATURE_FLAGS.CORE_FEATURES_ONLY && visibility === "shared" && (
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
                {!FEATURE_FLAGS.CORE_FEATURES_ONLY && visibility === "void" && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      ✨ Your memo will float into the universe for random listeners to discover. 
                      You'll see how many people found it, but not who.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="glass" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="hero" className="flex-1" onClick={handleSave}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Process & Save
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

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
