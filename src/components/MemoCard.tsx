import { useState, useRef } from "react";
import { Heart, MessageCircle, Globe, Lock, Play, Pause, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemoCardProps {
  memo: {
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
    author: {
      name: string;
      avatar?: string;
    };
    likes: number;
    comments: number;
  };
  variant?: "default" | "compact";
}

const categoryColors: Record<string, string> = {
  Ideas: "bg-coral-100 text-coral-500",
  Tasks: "bg-mint-100 text-mint-400",
  Reflections: "bg-lavender-100 text-lavender-400",
  Goals: "bg-coral-50 text-coral-400",
  Gratitude: "bg-mint-50 text-mint-300",
  Creative: "bg-lavender-50 text-lavender-300",
};

export function MemoCard({ memo, variant = "default" }: MemoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const togglePlayback = () => {
    if (!memo.audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(memo.audioUrl);
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const progress = memo.duration > 0 ? (currentTime / memo.duration) * 100 : 0;

  return (
    <div 
      className={cn(
        "glass-card rounded-2xl p-5 shadow-soft hover:shadow-medium transition-all duration-300 animate-fade-in",
        variant === "compact" && "p-4"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
            {memo.author.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-foreground">{memo.author.name}</p>
            <p className="text-xs text-muted-foreground">{formatTimeAgo(memo.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {memo.isPublic ? (
            <Globe className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Title & Play */}
      <div className="flex items-center gap-3 mb-3">
        <button 
          onClick={togglePlayback}
          disabled={!memo.audioUrl}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            memo.audioUrl 
              ? "bg-primary/10 hover:bg-primary/20 cursor-pointer" 
              : "bg-muted cursor-not-allowed"
          )}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Play className="h-4 w-4 text-primary ml-0.5" />
          )}
        </button>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-foreground">{memo.title}</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {isPlaying ? formatDuration(currentTime) : formatDuration(memo.duration)}
            </p>
            {memo.audioUrl && (
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-20">
                <div 
                  className="h-full gradient-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {memo.summary || memo.transcript.slice(0, 150)}
      </p>

      {/* Categories */}
      {memo.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {memo.categories.map((category) => (
            <span
              key={category}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                categoryColors[category] || "bg-muted text-muted-foreground"
              )}
            >
              {category}
            </span>
          ))}
        </div>
      )}

      {/* Tasks */}
      {memo.tasks.length > 0 && (
        <div className="bg-muted/50 rounded-xl p-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Extracted Tasks</p>
          <div className="space-y-2">
            {memo.tasks.slice(0, 3).map((task, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-mint-400" />
                <span className="text-sm text-foreground">{task}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {memo.isPublic && (
        <div className="flex items-center gap-4 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <Heart className="h-4 w-4 mr-1" />
            {memo.likes}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <MessageCircle className="h-4 w-4 mr-1" />
            {memo.comments}
          </Button>
        </div>
      )}
    </div>
  );
}
