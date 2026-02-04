import { useState, useEffect } from "react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { RecordingModal } from "@/components/RecordingModal";
import { MemoCard } from "@/components/MemoCard";
import { AuthModal } from "@/components/AuthModal";
import { FolderModal } from "@/components/FolderModal";
import { TopicSuggestions } from "@/components/TopicSuggestions";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/nativeToast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { MemoVisibility, ShareRecipient } from "@/hooks/useMemoSharing";
import { LogIn } from "lucide-react";
import { Folder } from "@/types/folder";

type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Memo {
  id: string;
  title: string;
  audioUrl?: string | null;
  transcript: string;
  summary: string | null;
  categories: string[];
  tasks: string[];
  isPublic: boolean;
  visibility?: MemoVisibility;
  createdAt: Date;
  duration: number;
  author: { name: string; avatar?: string };
  likes: number;
  comments: number;
  language?: string | null;
  folderId?: string | null;
  transcriptionStatus?: TranscriptionStatus;
}

export function RecordView() {
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<"transcribing" | "analyzing" | "saving">("transcribing");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentDuration, setCurrentDuration] = useState(0);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState("auto");
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const { user } = useAuth();
  const { getDisplayName, getAvatarUrl } = useProfile();
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (user) {
      loadMemos();
      loadFolders();
      
      // Subscribe to realtime updates for transcription status
      const channel = supabase
        .channel('record-view-memo-updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'memos',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const updated = payload.new as any;
          setMemos(prev => prev.map(m => 
            m.id === updated.id ? {
              ...m,
              title: updated.title,
              transcript: updated.transcript,
              summary: updated.summary,
              categories: updated.categories || [],
              tasks: updated.tasks || [],
              transcriptionStatus: updated.transcription_status as TranscriptionStatus,
            } : m
          ));
          
          if (updated.transcription_status === 'completed' && payload.old?.transcription_status === 'processing') {
            toast.success("Transcription complete!", { description: updated.title });
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      setMemos([]);
      setFolders([]);
    }
  }, [user]);

  const loadMemos = async () => {
    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading memos:", error);
      return;
    }

    if (data) {
      setMemos(data.map(m => ({
        id: m.id,
        title: m.title,
        audioUrl: m.audio_url,
        transcript: m.transcript,
        summary: m.summary,
        categories: m.categories || [],
        tasks: m.tasks || [],
        isPublic: m.is_public,
        visibility: m.visibility as MemoVisibility,
        createdAt: new Date(m.created_at),
        duration: m.duration,
        author: { name: getDisplayName(), avatar: getAvatarUrl() || undefined },
        likes: m.likes,
        comments: 0,
        language: m.language,
        folderId: m.folder_id,
        transcriptionStatus: (m.transcription_status as TranscriptionStatus) || 'completed',
      })));
    }
  };

  const loadFolders = async () => {
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user?.id)
      .order("name");

    if (error) {
      console.error("Error loading folders:", error);
      return;
    }

    if (data) {
      setFolders(data);
    }
  };

  const handleRecordingComplete = (transcript: string, duration: number, audioBlob: Blob | null, language: string) => {
    console.log("[RecordView] handleRecordingComplete called", { duration, hasBlob: !!audioBlob, user: !!user });
    
    // Require at least some audio to be recorded
    if (duration < 1) {
      console.log("[RecordView] Recording too short, duration:", duration);
      toast.error("Recording too short");
      return;
    }
    
    if (!user) {
      console.log("[RecordView] No user, showing auth modal");
      setCurrentTranscript(transcript);
      setCurrentDuration(duration);
      setCurrentAudioBlob(audioBlob);
      setCurrentLanguage(language);
      setShowAuthModal(true);
      toast.info("Sign in to save");
      return;
    }
    
    // Always show modal - ElevenLabs will transcribe even if browser STT failed
    console.log("[RecordView] Setting showModal to true");
    setCurrentTranscript(transcript);
    setCurrentDuration(duration);
    setCurrentAudioBlob(audioBlob);
    setCurrentLanguage(language);
    // Always use web modal - it works reliably across all platforms
    setShowModal(true);
  };

  const handleSave = async (data: { title: string; visibility: 'private' | 'shared' | 'followers' | 'void'; folderId: string | null; recipients?: Array<{ type: 'user' | 'group'; id: string; name: string }> }) => {
    // Check network connectivity first
    if (!isOnline) {
      toast.error("You're offline - connect to save");
      return;
    }

    if (!user) {
      toast.error("Please sign in to save memos");
      return;
    }
    
    setIsProcessing(true);
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
          title: data.title || "Voice Memo",
          transcript: currentTranscript || "Transcription in progress...",
          summary: "AI is analyzing your memo...",
          categories: ["Processing"],
          tasks: [],
          is_public: data.visibility === 'followers' || data.visibility === 'void',
          visibility: data.visibility,
          audio_url: audioUrl,
          duration: currentDuration,
          author_name: getDisplayName(),
          language: currentLanguage,
          folder_id: data.folderId || null,
          transcription_status: audioUrl ? 'pending' : 'completed',
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Create memo shares if visibility is 'shared'
      if (data.visibility === 'shared' && data.recipients && data.recipients.length > 0) {
        const shareEntries = data.recipients.map(recipient => ({
          memo_id: savedMemo.id,
          shared_with_user_id: recipient.type === 'user' ? recipient.id : null,
          shared_with_group_id: recipient.type === 'group' ? recipient.id : null,
          shared_by: user.id,
        }));

        await supabase.from('memo_shares').insert(shareEntries);
      }

      // Add to local state immediately
      const newMemo: Memo = {
        id: savedMemo.id,
        title: savedMemo.title,
        audioUrl: savedMemo.audio_url,
        transcript: savedMemo.transcript,
        summary: savedMemo.summary,
        categories: savedMemo.categories || [],
        tasks: savedMemo.tasks || [],
        isPublic: savedMemo.is_public,
        visibility: data.visibility,
        createdAt: new Date(savedMemo.created_at),
        duration: savedMemo.duration,
        author: { name: getDisplayName(), avatar: getAvatarUrl() || undefined },
        likes: savedMemo.likes,
        comments: 0,
        language: savedMemo.language,
        folderId: savedMemo.folder_id,
        transcriptionStatus: (savedMemo.transcription_status as TranscriptionStatus) || 'completed',
      };

      setMemos([newMemo, ...memos]);
      setShowModal(false);
      setCurrentTranscript("");
      setCurrentAudioBlob(null);
      
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
        
        toast.success("Saved", { description: "Transcription in progress" });
      } else {
        toast.success("Saved");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Save failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMemo = async (id: string) => {
    try {
      // Find the memo to get audio URL for cleanup
      const memo = memos.find(m => m.id === id);
      
      // Delete from database
      const { error } = await supabase
        .from("memos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Try to delete audio file if exists
      if (memo?.audioUrl) {
        const path = memo.audioUrl.split("/audio-memos/")[1];
        if (path) {
          await supabase.storage.from("audio-memos").remove([path]);
        }
      }

      setMemos(memos.filter(m => m.id !== id));
      toast.success("Memo deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete memo");
    }
  };

  const handleUpdateVisibility = async (id: string, visibility: MemoVisibility, recipients?: ShareRecipient[]) => {
    try {
      const isPublic = visibility === 'followers' || visibility === 'void';
      
      const { error } = await supabase
        .from("memos")
        .update({ visibility, is_public: isPublic })
        .eq("id", id);

      if (error) throw error;

      // Handle share recipients
      if (visibility === 'shared' && recipients && recipients.length > 0) {
        // Remove existing shares
        await supabase
          .from('memo_shares')
          .delete()
          .eq('memo_id', id)
          .eq('shared_by', user?.id);

        // Add new shares
        const shareEntries = recipients.map(recipient => ({
          memo_id: id,
          shared_with_user_id: recipient.type === 'user' ? recipient.id : null,
          shared_with_group_id: recipient.type === 'group' ? recipient.id : null,
          shared_by: user?.id,
        }));
        await supabase.from('memo_shares').insert(shareEntries);
      } else if (visibility !== 'shared') {
        // Remove all shares if not shared visibility
        await supabase
          .from('memo_shares')
          .delete()
          .eq('memo_id', id)
          .eq('shared_by', user?.id);
      }

      setMemos(memos.map(m => m.id === id ? { ...m, isPublic, visibility } : m));
    } catch (error) {
      console.error("Visibility update error:", error);
      toast.error("Failed to update visibility");
      throw error;
    }
  };

  const handleMoveToFolder = async (memoId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("memos")
        .update({ folder_id: folderId })
        .eq("id", memoId);

      if (error) throw error;

      setMemos(memos.map(m => m.id === memoId ? { ...m, folderId } : m));
      const folderName = folderId ? folders.find(f => f.id === folderId)?.name : "Unfiled";
      toast.success(`Moved to ${folderName}`);
    } catch (error) {
      console.error("Move to folder error:", error);
      toast.error("Failed to move memo");
    }
  };

  const handleUpdateTitle = async (id: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("memos")
        .update({ title: newTitle })
        .eq("id", id);

      if (error) throw error;

      setMemos(memos.map(m => m.id === id ? { ...m, title: newTitle } : m));
      toast.success("Title updated");
    } catch (error) {
      console.error("Title update error:", error);
      toast.error("Failed to update title");
    }
  };

  const handleCreateFolder = async (data: { name: string; description?: string; icon: string; color: string; is_public: boolean }) => {
    if (!user) return;
    
    setIsSavingFolder(true);
    try {
      const { data: newFolder, error } = await supabase
        .from("folders")
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description,
          icon: data.icon,
          color: data.color,
          is_public: data.is_public,
        })
        .select()
        .single();

      if (error) throw error;

      setFolders([...folders, newFolder]);
      setShowFolderModal(false);
      toast.success("Folder created");
    } catch (error) {
      console.error("Create folder error:", error);
      toast.error("Failed to create folder");
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleRetryTranscription = async (memoId: string) => {
    const memo = memos.find(m => m.id === memoId);
    if (!memo?.audioUrl) {
      toast.error("No audio available for transcription");
      return;
    }

    // Update status to pending
    setMemos(memos.map(m => 
      m.id === memoId ? { ...m, transcriptionStatus: 'pending' as TranscriptionStatus } : m
    ));

    try {
      // Update status in database
      await supabase
        .from("memos")
        .update({ transcription_status: 'pending' })
        .eq("id", memoId);

      // Trigger background transcription
      await supabase.functions.invoke("background-transcribe", {
        body: { 
          memo_id: memoId, 
          audio_url: memo.audioUrl, 
          language: memo.language || "auto" 
        },
      });

      toast.success("Retrying transcription...");
    } catch (error) {
      console.error("Retry transcription error:", error);
      setMemos(memos.map(m => 
        m.id === memoId ? { ...m, transcriptionStatus: 'failed' as TranscriptionStatus } : m
      ));
      toast.error("Failed to retry transcription");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 pb-36 relative h-full overflow-y-auto overscroll-contain">
      {/* Voice Recorder */}
      <div className="mb-12">
        <VoiceRecorder 
          onRecordingComplete={handleRecordingComplete} 
          onRecordingStateChange={setIsRecording}
        />
        
        {/* Topic Suggestions - shown when not recording */}
        <TopicSuggestions isRecording={isRecording} />
      </div>

      {/* Auth prompt for non-logged in users */}
      {!user && (
        <div className="bg-muted/50 rounded-2xl p-10 mb-14 text-center animate-fade-in border border-border/50">
          <LogIn className="h-10 w-10 text-foreground/60 mx-auto mb-5" />
          <h3 className="font-display font-semibold text-xl mb-3">Sign in to save your memos</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
            Create an account to save recordings, access AI summaries, and discover ideas from others.
          </p>
          <Button 
            variant="outline" 
            className="border-foreground/20 hover:bg-foreground/5"
            onClick={() => setShowAuthModal(true)}
          >
            Get Started
          </Button>
        </div>
      )}

      {/* Recent Memos */}
      {user && memos.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-xl text-foreground mb-8">
            Your Recent Memos
          </h3>
          <div className="space-y-8">
            {memos.map((memo, i) => (
              <div 
                key={memo.id} 
                style={{ animationDelay: `${i * 100}ms` }}
                className="animate-slide-up"
              >
                <MemoCard 
                  memo={memo} 
                  canDelete={true}
                  onDelete={handleDeleteMemo}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateVisibility={handleUpdateVisibility}
                  onMoveToFolder={handleMoveToFolder}
                  onCreateFolder={() => setShowFolderModal(true)}
                  onRetryTranscription={handleRetryTranscription}
                  folders={folders}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {user && memos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground animate-fade-in">
          <p>No memos yet. Record your first thought!</p>
        </div>
      )}

      <RecordingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        isProcessing={isProcessing}
        processingStep={processingStep}
        transcript={currentTranscript}
      />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      <FolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSave={handleCreateFolder}
        isLoading={isSavingFolder}
      />
    </div>
  );
}
