import { useState } from "react";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { RecordingModal } from "@/components/RecordingModal";
import { MemoCard } from "@/components/MemoCard";
import { mockMemos } from "@/data/mockData";
import { Memo } from "@/types/memo";
import { toast } from "sonner";

export function RecordView() {
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentMemos, setRecentMemos] = useState<Memo[]>(
    mockMemos.filter(m => m.author.name === "You")
  );
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setCurrentBlob(blob);
    setCurrentDuration(duration);
    setShowModal(true);
  };

  const handleSave = async (data: { title: string; isPublic: boolean }) => {
    setIsProcessing(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const newMemo: Memo = {
      id: Date.now().toString(),
      title: data.title,
      transcript: "This is a simulated transcript of your voice memo...",
      summary: "AI-generated summary of your recording will appear here.",
      categories: ["Ideas"],
      tasks: ["Follow up on this thought", "Research related topics"],
      isPublic: data.isPublic,
      createdAt: new Date(),
      duration: currentDuration,
      author: { name: "You" },
      likes: 0,
      comments: 0,
    };

    setRecentMemos([newMemo, ...recentMemos]);
    setIsProcessing(false);
    setShowModal(false);
    setCurrentBlob(null);
    
    toast.success("Memo saved!", {
      description: "AI has summarized and categorized your thoughts.",
    });
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
      />
    </div>
  );
}
