import { useState, useRef, useCallback } from "react";
import { Heart, MessageCircle, Globe, Lock, Play, Pause, CheckCircle2, Trash2, MoreVertical, FileText, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/AudioWaveform";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    language?: string | null;
  };
  variant?: "default" | "compact";
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

const LANGUAGE_DISPLAY: Record<string, { flag: string; short: string }> = {
  "en-US": { flag: "🇺🇸", short: "EN" },
  "ru-RU": { flag: "🇷🇺", short: "RU" },
  "uk-UA": { flag: "🇺🇦", short: "UA" },
  "es-ES": { flag: "🇪🇸", short: "ES" },
  "fr-FR": { flag: "🇫🇷", short: "FR" },
  "de-DE": { flag: "🇩🇪", short: "DE" },
  "auto": { flag: "🌐", short: "Auto" },
};

const categoryColors: Record<string, string> = {
  Ideas: "bg-coral-100 text-coral-500",
  Tasks: "bg-mint-100 text-mint-400",
  Reflections: "bg-lavender-100 text-lavender-400",
  Goals: "bg-coral-50 text-coral-400",
  Gratitude: "bg-mint-50 text-mint-300",
  Creative: "bg-lavender-50 text-lavender-300",
};

export function MemoCard({ memo, variant = "default", onDelete, canDelete = false }: MemoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(memo.duration);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(memo.transcript);
      toast.success("Transcript copied to clipboard");
    } catch {
      toast.error("Failed to copy transcript");
    }
  };

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

  const initAudio = useCallback(() => {
    if (!memo.audioUrl || audioRef.current) return audioRef.current;
    
    const audio = new Audio(memo.audioUrl);
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
    };
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audioRef.current = audio;
    return audio;
  }, [memo.audioUrl]);

  const togglePlayback = () => {
    if (!memo.audioUrl) return;

    const audio = initAudio();
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = useCallback((time: number) => {
    const audio = initAudio();
    if (!audio) return;
    
    audio.currentTime = time;
    setCurrentTime(time);
    
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  }, [initAudio, isPlaying]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(memo.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatTimeAgo(memo.createdAt)}</span>
                {memo.language && LANGUAGE_DISPLAY[memo.language] && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {LANGUAGE_DISPLAY[memo.language].flag}
                      {LANGUAGE_DISPLAY[memo.language].short}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {memo.isPublic ? (
              <Globe className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete memo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-display font-semibold text-foreground mb-3">{memo.title}</h3>

        {/* Audio Player with Waveform */}
        {memo.audioUrl && (
          <div className="bg-muted/30 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-soft hover:shadow-glow transition-shadow flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <AudioWaveform
                  audioUrl={memo.audioUrl}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={audioDuration}
                  onSeek={handleSeek}
                />
              </div>
              
              <div className="text-xs text-muted-foreground font-medium flex-shrink-0">
                {formatDuration(currentTime)} / {formatDuration(audioDuration)}
              </div>
            </div>
          </div>
        )}

        {/* No audio fallback */}
        {!memo.audioUrl && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Play className="h-4 w-4 text-muted-foreground ml-0.5" />
            </div>
            <p className="text-xs text-muted-foreground">No audio available</p>
          </div>
        )}

        {/* Summary */}
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {memo.summary || memo.transcript.slice(0, 150)}
        </p>

        {/* View Transcript Button */}
        <button
          onClick={() => setShowTranscriptDialog(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mb-4"
        >
          <FileText className="h-3.5 w-3.5" />
          View full transcript
        </button>

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{memo.title}" and its audio recording. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Full Transcript</DialogTitle>
            <DialogDescription>{memo.title}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] mt-2">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-4">
              {memo.transcript}
            </p>
          </ScrollArea>
          <div className="flex justify-end mt-4">
            <Button onClick={handleCopyTranscript} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy transcript
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
