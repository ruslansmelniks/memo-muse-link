import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLikes } from "@/hooks/useLikes";
import { useFollow } from "@/hooks/useFollow";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/AudioWaveform";
import { 
  ArrowLeft, 
  Globe, 
  Lock, 
  Play, 
  Pause, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Mail,
  MessageCircle,
  FileText,
  X,
  Heart,
  Eye,
  UserPlus,
  UserMinus
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Memo {
  id: string;
  title: string;
  audioUrl: string | null;
  transcript: string;
  summary: string | null;
  categories: string[];
  tasks: string[];
  isPublic: boolean;
  createdAt: Date;
  duration: number;
  author: { id: string; name: string; avatar?: string };
  language: string | null;
  likes: number;
  viewCount: number;
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

export default function MemoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isLiked, toggleLike, setInitialLikeCount } = useLikes();
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const PLAYBACK_SPEEDS = [1, 1.2, 1.5, 2];

  useEffect(() => {
    async function fetchMemo() {
      if (!id) {
        setError("Memo not found");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("memos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        setError("Failed to load memo");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Memo not found");
        setLoading(false);
        return;
      }

      // Check if memo is public (non-authenticated users can only see public memos)
      if (!data.is_public) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== data.user_id) {
          setError("This memo is private");
          setLoading(false);
          return;
        }
      }

      // Fetch profile for avatar
      let authorAvatar: string | undefined;
      if (data.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("user_id", data.user_id)
          .maybeSingle();
        authorAvatar = profile?.avatar_url || undefined;
      }

      // Increment view count for public memos
      if (data.is_public) {
        await supabase.rpc("increment_view_count", { memo_uuid: id });
      }

      setMemo({
        id: data.id,
        title: data.title,
        audioUrl: data.audio_url,
        transcript: data.transcript,
        summary: data.summary,
        categories: data.categories || [],
        tasks: data.tasks || [],
        isPublic: data.is_public,
        createdAt: new Date(data.created_at),
        duration: data.duration,
        author: { id: data.user_id || "", name: data.author_name, avatar: authorAvatar },
        language: data.language,
        likes: data.likes,
        viewCount: data.view_count,
      });
      setLikeCount(data.likes);
      setInitialLikeCount(data.id, data.likes);
      setAudioDuration(data.duration);
      setLoading(false);
    }

    fetchMemo();
  }, [id, setInitialLikeCount]);

  const initAudio = useCallback(() => {
    if (!memo?.audioUrl || audioRef.current) return audioRef.current;
    
    const audio = new Audio(memo.audioUrl);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => setAudioDuration(audio.duration);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audioRef.current = audio;
    return audio;
  }, [memo?.audioUrl]);

  const togglePlayback = () => {
    if (!memo?.audioUrl) return;
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

  const cyclePlaybackSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMemoUrl = () => `${window.location.origin}/memo/${id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getMemoUrl());
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: memo?.title,
          text: memo?.summary || memo?.transcript.slice(0, 100),
          url: getMemoUrl(),
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== "AbortError") {
          toast.error("Failed to share");
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = `${memo?.title}\n\n${memo?.summary || memo?.transcript.slice(0, 100)}\n\n${getMemoUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleEmailShare = () => {
    const subject = memo?.title || "Check out this memo";
    const body = `${memo?.summary || memo?.transcript.slice(0, 200)}\n\nListen here: ${getMemoUrl()}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  const handleCopyTranscript = async () => {
    if (!memo) return;
    try {
      await navigator.clipboard.writeText(memo.transcript);
      toast.success("Transcript copied to clipboard");
    } catch {
      toast.error("Failed to copy transcript");
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Sign in to like memos");
      return;
    }
    if (!memo) return;
    const result = await toggleLike(memo.id, likeCount);
    if (result.success) {
      setLikeCount(result.newCount);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Sign in to follow creators");
      return;
    }
    if (!memo?.author.id) return;
    
    const success = await toggleFollow(memo.author.id);
    if (success) {
      toast.success(isFollowing(memo.author.id) ? "Unfollowed" : "Following");
    }
  };

  const isOwnMemo = user?.id === memo?.author.id;
  const userIsFollowing = memo?.author.id ? isFollowing(memo.author.id) : false;
  const memoIsLiked = memo ? isLiked(memo.id) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading memo...</div>
      </div>
    );
  }

  if (error || !memo) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to app
            </Button>
          </Link>
          <div className="text-center py-16">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">
              {error || "Memo not found"}
            </h1>
            <p className="text-muted-foreground">
              This memo may be private or doesn't exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-hero opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-64 h-64 rounded-full gradient-secondary opacity-10 blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {navigator.share && (
                <>
                  <DropdownMenuItem onClick={handleNativeShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleWhatsAppShare}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Share on WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEmailShare}>
                <Mail className="h-4 w-4 mr-2" />
                Share via Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Memo Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 border border-border/50"
        >
          {/* Author & Meta */}
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
                  <span>{formatDate(memo.createdAt)}</span>
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
              {/* Follow Button */}
              {memo.isPublic && !isOwnMemo && memo.author.id && (
                <Button
                  variant={userIsFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className="h-8"
                >
                  {userIsFollowing ? (
                    <>
                      <UserMinus className="h-3.5 w-3.5 mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              )}
              {memo.isPublic ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="font-display font-semibold text-xl text-foreground mb-4">
            {memo.title}
          </h1>

          {/* Audio Player */}
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
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={cyclePlaybackSpeed}
                    className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors min-w-[40px]"
                  >
                    {playbackSpeed}x
                  </button>
                  <div className="text-xs text-muted-foreground font-medium">
                    {formatDuration(currentTime)} / {formatDuration(audioDuration)}
                  </div>
                </div>
              </div>
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
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Nuggets</p>
              <div className="space-y-2">
                {memo.tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-mint-400" />
                    <span className="text-sm text-foreground">{task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Footer */}
          {memo.isPublic && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
              <div className="flex items-center gap-4">
                {/* Like Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={cn(
                    "text-muted-foreground hover:text-primary",
                    memoIsLiked && "text-red-500 hover:text-red-600"
                  )}
                >
                  <Heart
                    className={cn("h-4 w-4 mr-1", memoIsLiked && "fill-current")}
                  />
                  {likeCount}
                </Button>

                {/* View Count */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  {memo.viewCount}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Full Transcript</DialogTitle>
            <DialogDescription>
              {memo.title}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] mt-4">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pr-4">
              {memo.transcript}
            </p>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleCopyTranscript}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowTranscriptDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
