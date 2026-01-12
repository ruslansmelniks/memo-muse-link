import { useState } from "react";
import { X, Globe, Lock, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; isPublic: boolean }) => void;
  isProcessing?: boolean;
  transcript?: string;
}

export function RecordingModal({ isOpen, onClose, onSave, isProcessing, transcript }: RecordingModalProps) {
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ title: title || "Untitled memo", isPublic });
    setTitle("");
    setIsPublic(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div 
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg glass-card rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-xl">Save Recording</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {isProcessing ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full gradient-primary animate-pulse-soft" />
              <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary-foreground animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Processing with AI</p>
              <p className="text-sm text-muted-foreground mt-1">Summarizing and extracting tasks...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Transcript Preview */}
            {transcript && (
              <div className="mb-4 p-3 rounded-xl bg-muted/50 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-1">Transcript</p>
                <p className="text-sm text-foreground">{transcript}</p>
              </div>
            )}

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

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Globe className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {isPublic ? "Public" : "Private"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isPublic 
                        ? "Others can discover and discuss" 
                        : "Only visible to you"}
                    </p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
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
  );
}
