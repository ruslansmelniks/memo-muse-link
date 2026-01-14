import { useState, useEffect } from "react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { RecordingModal } from "@/components/RecordingModal";
import { MemoCard } from "@/components/MemoCard";
import { AuthModal } from "@/components/AuthModal";
import { FolderModal } from "@/components/FolderModal";
import { TopicSuggestions } from "@/components/TopicSuggestions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { LogIn } from "lucide-react";
import { Folder } from "@/types/folder";

interface Memo {
  id: string;
  title: string;
  audioUrl?: string | null;
  transcript: string;
  summary: string | null;
  categories: string[];
  tasks: string[];
  isPublic: boolean;
  createdAt: Date;
  duration: number;
  author: { name: string; avatar?: string };
  likes: number;
  comments: number;
  language?: string | null;
  folderId?: string | null;
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

  useEffect(() => {
    if (user) {
      loadMemos();
      loadFolders();
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
        createdAt: new Date(m.created_at),
        duration: m.duration,
        author: { name: getDisplayName(), avatar: getAvatarUrl() || undefined },
        likes: m.likes,
        comments: 0,
        language: m.language,
        folderId: m.folder_id,
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
    // Require at least some audio to be recorded
    if (duration < 1) {
      toast.error("Recording too short", {
        description: "Please record for at least 1 second.",
      });
      return;
    }
    
    if (!user) {
      setCurrentTranscript(transcript);
      setCurrentDuration(duration);
      setCurrentAudioBlob(audioBlob);
      setCurrentLanguage(language);
      setShowAuthModal(true);
      toast.info("Sign in required", {
        description: "Create an account to save your memos.",
      });
      return;
    }
    
    // Always show modal - ElevenLabs will transcribe even if browser STT failed
    setCurrentTranscript(transcript);
    setCurrentDuration(duration);
    setCurrentAudioBlob(audioBlob);
    setCurrentLanguage(language);
    setShowModal(true);
    
    // Show helpful toast about what happens next
    if (!transcript.trim()) {
      toast.info("Processing your recording...", {
        description: "AI will transcribe and summarize your audio.",
      });
    }
  };

  const handleSave = async (data: { title: string; isPublic: boolean; folderId?: string | null }) => {
    if (!user) {
      toast.error("Please sign in to save memos");
      return;
    }
    
    setIsProcessing(true);
    setProcessingStep("transcribing");
    
    try {
      // Upload audio file if available
      let audioUrl: string | null = null;
      let transcriptToProcess = currentTranscript;
      let detectedLanguage = currentLanguage;
      
      if (currentAudioBlob) {
        const fileName = `${user.id}/memo-${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("audio-memos")
          .upload(fileName, currentAudioBlob, {
            contentType: "audio/webm",
          });

        if (uploadError) {
          console.error("Audio upload error:", uploadError);
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("audio-memos")
            .getPublicUrl(uploadData.path);
          audioUrl = urlData.publicUrl;
        }
        
        // Use ElevenLabs for higher-accuracy transcription
        try {
          const formData = new FormData();
          formData.append("audio", currentAudioBlob, "recording.webm");
          formData.append("language", currentLanguage);
          
          const transcribeResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: formData,
            }
          );
          
          if (transcribeResponse.ok) {
            const transcription = await transcribeResponse.json();
            if (transcription.text && transcription.text.trim()) {
              transcriptToProcess = transcription.text;
              detectedLanguage = transcription.language || currentLanguage;
              console.log("ElevenLabs transcription:", transcription);
            }
          } else {
            console.warn("ElevenLabs transcription failed, using browser transcript");
          }
        } catch (transcribeError) {
          console.warn("ElevenLabs transcription error, using browser transcript:", transcribeError);
        }
      }

      // Step 2: AI Analysis
      setProcessingStep("analyzing");

      // Call the AI processing edge function
      const { data: result, error } = await supabase.functions.invoke("process-memo", {
        body: { transcript: transcriptToProcess, language: detectedLanguage },
      });

      if (error) {
        throw error;
      }

      // Step 3: Save to database
      setProcessingStep("saving");
      
      // Save to database with user_id
      const { data: savedMemo, error: dbError } = await supabase
        .from("memos")
        .insert({
          user_id: user.id,
          title: data.title || result.title || "Voice Memo",
          transcript: result.transcript || transcriptToProcess,
          summary: result.summary || transcriptToProcess.slice(0, 150),
          categories: result.categories || ["Ideas"],
          tasks: result.tasks || [],
          is_public: data.isPublic,
          audio_url: audioUrl,
          duration: currentDuration,
          author_name: getDisplayName(),
          language: result.language || detectedLanguage,
          folder_id: data.folderId || null,
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      const newMemo: Memo = {
        id: savedMemo.id,
        title: savedMemo.title,
        audioUrl: savedMemo.audio_url,
        transcript: savedMemo.transcript,
        summary: savedMemo.summary,
        categories: savedMemo.categories || [],
        tasks: savedMemo.tasks || [],
        isPublic: savedMemo.is_public,
        createdAt: new Date(savedMemo.created_at),
        duration: savedMemo.duration,
        author: { name: getDisplayName(), avatar: getAvatarUrl() || undefined },
        likes: savedMemo.likes,
        comments: 0,
        language: savedMemo.language,
      };

      setMemos([newMemo, ...memos]);
      setShowModal(false);
      setCurrentTranscript("");
      setCurrentAudioBlob(null);
      
      toast.success("Memo saved!", {
        description: `AI found ${result.tasks?.length || 0} nuggets and categorized as ${result.categories?.join(", ") || "Ideas"}.`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Processing failed", {
        description: "Could not process memo. Please try again.",
      });
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

  const handleToggleVisibility = async (id: string, isPublic: boolean) => {
    try {
      const { error } = await supabase
        .from("memos")
        .update({ is_public: isPublic })
        .eq("id", id);

      if (error) throw error;

      setMemos(memos.map(m => m.id === id ? { ...m, isPublic } : m));
      toast.success(isPublic ? "Memo is now public" : "Memo is now private");
    } catch (error) {
      console.error("Visibility update error:", error);
      toast.error("Failed to update visibility");
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

  return (
    <div className="container mx-auto px-4 py-12 pb-36">
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
                  onToggleVisibility={handleToggleVisibility}
                  onMoveToFolder={handleMoveToFolder}
                  onCreateFolder={() => setShowFolderModal(true)}
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
