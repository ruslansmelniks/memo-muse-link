import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Globe, Lock, Play, Pause, CheckCircle2, Trash2, MoreVertical, FileText, Copy, Pencil, Check, X, FolderInput, Folder as FolderIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { AudioWaveform } from "@/components/AudioWaveform";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Folder, FOLDER_COLORS, FolderIcon as FolderIconType } from "@/types/folder";
import { 
  Folder as FolderIconLucide, 
  Briefcase, 
  Book, 
  Heart as HeartIcon, 
  Star, 
  Lightbulb, 
  Music, 
  Camera, 
  Code, 
  Coffee,
  Inbox
} from "lucide-react";

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
    folderId?: string | null;
  };
  variant?: "default" | "compact";
  onDelete?: (id: string) => void;
  onUpdateTitle?: (id: string, newTitle: string) => void;
  onMoveToFolder?: (memoId: string, folderId: string | null) => void;
  onToggleVisibility?: (id: string, isPublic: boolean) => void;
  onCreateFolder?: () => void;
  folders?: Folder[];
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
  Nuggets: "bg-mint-100 text-mint-400",
  Reflections: "bg-lavender-100 text-lavender-400",
  Goals: "bg-coral-50 text-coral-400",
  Gratitude: "bg-mint-50 text-mint-300",
  Creative: "bg-lavender-50 text-lavender-300",
};

const iconComponents: Record<FolderIconType, React.ElementType> = {
  folder: FolderIconLucide,
  briefcase: Briefcase,
  book: Book,
  heart: HeartIcon,
  star: Star,
  lightbulb: Lightbulb,
  music: Music,
  camera: Camera,
  code: Code,
  coffee: Coffee,
};

export function MemoCard({ memo, variant = "default", onDelete, onUpdateTitle, onMoveToFolder, onToggleVisibility, onCreateFolder, folders = [], canDelete = false }: MemoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(memo.duration);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(memo.title);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentFolder = folders.find(f => f.id === memo.folderId);

  const handleSaveTitle = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== memo.title && onUpdateTitle) {
      onUpdateTitle(memo.id, trimmedTitle);
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(memo.title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

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
    if (!memo.audioUrl) return null;
    
    // Always create fresh audio element if we don't have one
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = memo.audioUrl;
      
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.onerror = (e) => {
        console.error("Audio error:", e);
        setIsPlaying(false);
      };
      
      audioRef.current = audio;
    }
    
    return audioRef.current;
  }, [memo.audioUrl]);

  const togglePlayback = async () => {
    if (!memo.audioUrl) return;

    const audio = initAudio();
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        // Ensure audio is loaded before playing
        if (audio.readyState < 2) {
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Playback error:", error);
        // Try loading and playing again
        try {
          audio.load();
          await audio.play();
          setIsPlaying(true);
        } catch (retryError) {
          console.error("Retry playback failed:", retryError);
        }
      }
    }
  };

  const handleSeek = useCallback(async (time: number) => {
    const audio = initAudio();
    if (!audio) return;
    
    // Ensure audio is loaded before seeking
    if (audio.readyState < 2) {
      audio.load();
      await new Promise(resolve => {
        audio.oncanplay = resolve;
      });
    }
    
    audio.currentTime = time;
    setCurrentTime(time);
    
    if (!isPlaying) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Seek playback error:", error);
      }
    }
  }, [initAudio, isPlaying]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(memo.id);
    }
    setShowDeleteDialog(false);
  };

  const getColorClass = (colorId: string) => {
    return FOLDER_COLORS.find(c => c.id === colorId)?.class || "bg-primary";
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={{ y: -2 }}
        className={cn(
          "bg-card rounded-2xl p-6 border border-border/50 transition-colors duration-200 hover:border-border",
          variant === "compact" && "p-5"
        )}
      >
      {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {memo.author.avatar ? (
              <img 
                src={memo.author.avatar} 
                alt={memo.author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-medium text-sm">
                {memo.author.name.charAt(0).toUpperCase()}
              </div>
            )}
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
                  <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px]">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* View Transcript */}
                  <DropdownMenuItem onClick={() => setShowTranscriptDialog(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    View transcript
                  </DropdownMenuItem>
                  
                  {onUpdateTitle && (
                    <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit title
                    </DropdownMenuItem>
                  )}
                  
                  {/* Toggle Visibility */}
                  {onToggleVisibility && (
                    <DropdownMenuItem onClick={() => onToggleVisibility(memo.id, !memo.isPublic)}>
                      {memo.isPublic ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Make private
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Make public
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Move to Folder */}
                  {onMoveToFolder && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderInput className="h-4 w-4 mr-2" />
                        Move to folder
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem 
                          onClick={() => onMoveToFolder(memo.id, null)}
                          className={cn(!memo.folderId && "bg-muted")}
                        >
                          <Inbox className="h-4 w-4 mr-2" />
                          Unfiled
                          {!memo.folderId && <Check className="h-4 w-4 ml-auto" />}
                        </DropdownMenuItem>
                        {folders.length > 0 && <DropdownMenuSeparator />}
                        {folders.map(folder => {
                          const IconComponent = iconComponents[folder.icon as FolderIconType] || FolderIconLucide;
                          return (
                            <DropdownMenuItem 
                              key={folder.id}
                              onClick={() => onMoveToFolder(memo.id, folder.id)}
                              className={cn(memo.folderId === folder.id && "bg-muted")}
                            >
                              <div className={cn("w-5 h-5 rounded flex items-center justify-center mr-2", getColorClass(folder.color))}>
                                <IconComponent className="h-3 w-3 text-white" />
                              </div>
                              {folder.name}
                              {memo.folderId === folder.id && <Check className="h-4 w-4 ml-auto" />}
                            </DropdownMenuItem>
                          );
                        })}
                        {onCreateFolder && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onCreateFolder}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create new folder
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  
                  <DropdownMenuSeparator />
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

        {/* Folder Badge */}
        {currentFolder && (
          <div className="flex items-center gap-1.5 mb-2">
            {(() => {
              const IconComponent = iconComponents[currentFolder.icon as FolderIconType] || FolderIconLucide;
              return (
                <div className={cn("w-4 h-4 rounded flex items-center justify-center", getColorClass(currentFolder.color))}>
                  <IconComponent className="h-2.5 w-2.5 text-white" />
                </div>
              );
            })()}
            <span className="text-xs text-muted-foreground">{currentFolder.name}</span>
          </div>
        )}

        {/* Title */}
        {isEditingTitle ? (
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-lg bg-muted border border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground font-display font-semibold"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveTitle}>
              <Check className="h-4 w-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEdit}>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <h3 className="font-display font-semibold text-foreground mb-4">{memo.title}</h3>
        )}

        {/* Audio Player with Waveform */}
        {memo.audioUrl && (
          <div className="bg-muted/30 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-4">
              <motion.button 
                onClick={togglePlayback}
                whileTap={{ scale: 0.92 }}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-foreground/10 flex items-center justify-center active:bg-foreground/20 transition-colors flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-foreground" />
                ) : (
                  <Play className="h-4 w-4 text-foreground ml-0.5" />
                )}
              </motion.button>
              
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
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {memo.summary || memo.transcript.slice(0, 150)}
        </p>

        {/* View Transcript Button */}
        <button
          onClick={() => setShowTranscriptDialog(true)}
          className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors mb-5"
        >
          <FileText className="h-3.5 w-3.5" />
          View full transcript
        </button>

        {/* Categories */}
        {memo.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {memo.categories.map((category) => (
              <span
                key={category}
                className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
              >
                {category}
              </span>
            ))}
          </div>
        )}

        {/* Nuggets */}
        {memo.tasks.length > 0 && (
          <div className="bg-muted/50 rounded-xl p-3 mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Nuggets</p>
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
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <Heart className="h-4 w-4 mr-1" />
                {memo.likes}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <MessageCircle className="h-4 w-4 mr-1" />
                {memo.comments}
              </Button>
            </div>
            <ShareButton 
              memoId={memo.id} 
              title={memo.title} 
              summary={memo.summary} 
              isPublic={memo.isPublic} 
            />
          </div>
        )}
      </motion.div>

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
