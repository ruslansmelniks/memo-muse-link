import { useState } from "react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { RecordingModal } from "@/components/RecordingModal";
import { MemoCard } from "@/components/MemoCard";
import { mockMemos } from "@/data/mockData";
import { Memo } from "@/types/memo";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function RecordView() {
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentMemos, setRecentMemos] = useState<Memo[]>(
    mockMemos.filter(m => m.author.name === "You")
  );
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentDuration, setCurrentDuration] = useState(0);

  const handleRecordingComplete = (transcript: string, duration: number) => {
    if (!transcript.trim()) {
      toast.error("No speech detected", {
        description: "Please try recording again and speak clearly.",
      });
      return;
    }
    setCurrentTranscript(transcript);
    setCurrentDuration(duration);
    setShowModal(true);
  };

  const handleSave = async (data: { title: string; isPublic: boolean }) => {
    setIsProcessing(true);
    
    try {
      // Call the AI processing edge function
      const { data: result, error } = await supabase.functions.invoke("process-memo", {
        body: { transcript: currentTranscript },
      });

      if (error) {
        throw error;
      }

      const newMemo: Memo = {
        id: Date.now().toString(),
        title: data.title || result.title || "Voice Memo",
        transcript: result.transcript || currentTranscript,
        summary: result.summary || currentTranscript.slice(0, 150),
        categories: result.categories || ["Ideas"],
        tasks: result.tasks || [],
        isPublic: data.isPublic,
        createdAt: new Date(),
        duration: currentDuration,
        author: { name: "You" },
        likes: 0,
        comments: 0,
      };

      setRecentMemos([newMemo, ...recentMemos]);
      setShowModal(false);
      setCurrentTranscript("");
      
      toast.success("Memo saved!", {
        description: `AI extracted ${result.tasks?.length || 0} tasks and categorized as ${result.categories?.join(", ") || "Ideas"}.`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Processing failed", {
        description: "Could not process memo. Saving with basic info.",
      });
      
      // Fallback: save without AI processing
      const newMemo: Memo = {
        id: Date.now().toString(),
        title: data.title || "Voice Memo",
        transcript: currentTranscript,
        summary: currentTranscript.slice(0, 150) + (currentTranscript.length > 150 ? "..." : ""),
        categories: ["Ideas"],
        tasks: [],
        isPublic: data.isPublic,
        createdAt: new Date(),
        duration: currentDuration,
        author: { name: "You" },
        likes: 0,
        comments: 0,
      };

      setRecentMemos([newMemo, ...recentMemos]);
      setShowModal(false);
      setCurrentTranscript("");
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
      {recentMemos.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-4">
            Your Recent Memos
          </h3>
          <div className="space-y-4">
            {recentMemos.map((memo, i) => (
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
