import { useState, useEffect } from "react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { RecordingModal } from "@/components/RecordingModal";
import { MemoCard } from "@/components/MemoCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  author: { name: string };
  likes: number;
  comments: number;
}

export function RecordView() {
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentDuration, setCurrentDuration] = useState(0);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);

  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    const { data, error } = await supabase
      .from("memos")
      .select("*")
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
        author: { name: m.author_name },
        likes: m.likes,
        comments: 0,
      })));
    }
  };

  const handleRecordingComplete = (transcript: string, duration: number, audioBlob: Blob | null) => {
    if (!transcript.trim()) {
      toast.error("No speech detected", {
        description: "Please try recording again and speak clearly.",
      });
      return;
    }
    setCurrentTranscript(transcript);
    setCurrentDuration(duration);
    setCurrentAudioBlob(audioBlob);
    setShowModal(true);
  };

  const handleSave = async (data: { title: string; isPublic: boolean }) => {
    setIsProcessing(true);
    
    try {
      // Upload audio file if available
      let audioUrl: string | null = null;
      if (currentAudioBlob) {
        const fileName = `memo-${Date.now()}.webm`;
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
      }

      // Call the AI processing edge function
      const { data: result, error } = await supabase.functions.invoke("process-memo", {
        body: { transcript: currentTranscript },
      });

      if (error) {
        throw error;
      }

      // Save to database
      const { data: savedMemo, error: dbError } = await supabase
        .from("memos")
        .insert({
          title: data.title || result.title || "Voice Memo",
          transcript: result.transcript || currentTranscript,
          summary: result.summary || currentTranscript.slice(0, 150),
          categories: result.categories || ["Ideas"],
          tasks: result.tasks || [],
          is_public: data.isPublic,
          audio_url: audioUrl,
          duration: currentDuration,
          author_name: "You",
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
        author: { name: savedMemo.author_name },
        likes: savedMemo.likes,
        comments: 0,
      };

      setMemos([newMemo, ...memos]);
      setShowModal(false);
      setCurrentTranscript("");
      setCurrentAudioBlob(null);
      
      toast.success("Memo saved!", {
        description: `AI extracted ${result.tasks?.length || 0} tasks and categorized as ${result.categories?.join(", ") || "Ideas"}.`,
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

  return (
    <div className="container mx-auto px-4 py-6 pb-32">
      {/* Hero Section */}
      <div className="text-center mb-8 animate-fade-in">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">
          Capture Your Thoughts
        </h2>
        <p className="text-muted-foreground">
          Record while walking, cleaning, or whenever inspiration strikes
        </p>
      </div>

      {/* Voice Recorder */}
      <div className="mb-10">
        <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
      </div>

      {/* Recent Memos */}
      {memos.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-4">
            Your Recent Memos
          </h3>
          <div className="space-y-4">
            {memos.map((memo, i) => (
              <div 
                key={memo.id} 
                style={{ animationDelay: `${i * 100}ms` }}
                className="animate-slide-up"
              >
                <MemoCard memo={memo} />
              </div>
            ))}
          </div>
        </div>
      )}

      <RecordingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        isProcessing={isProcessing}
        transcript={currentTranscript}
      />
    </div>
  );
}
