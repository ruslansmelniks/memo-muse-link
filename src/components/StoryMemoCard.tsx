import { useState, useEffect, useRef, useCallback } from "react";
import { motion, PanInfo, useMotionValue, useTransform, animate } from "framer-motion";
import { Play, Pause, Heart, Eye, UserPlus, UserMinus, Volume2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { useLikes } from "@/hooks/useLikes";
import { usePlaybackSpeed } from "@/hooks/usePlaybackSpeed";
import { AudioWaveform } from "@/components/AudioWaveform";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { DiscoverMemo } from "@/hooks/useDiscoverMemos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const LANGUAGE_DISPLAY: Record<string, { flag: string; short: string }> = {
  "en-US": { flag: "🇺🇸", short: "EN" },
  "ru-RU": { flag: "🇷🇺", short: "RU" },
  "uk-UA": { flag: "🇺🇦", short: "UA" },
  "es-ES": { flag: "🇪🇸", short: "ES" },
  "fr-FR": { flag: "🇫🇷", short: "FR" },
  "de-DE": { flag: "🇩🇪", short: "DE" },
  "auto": { flag: "🌐", short: "Auto" },
};

interface StoryMemoCardProps {
  memo: DiscoverMemo;
  isActive: boolean;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
}

export function StoryMemoCard({ memo, isActive, onSwipeUp, onSwipeDown }: StoryMemoCardProps) {
  const { user } = useAuth();
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow();
  const { isLiked, toggleLike, setInitialLikeCount } = useLikes();
  const { speed: playbackSpeed, cycleSpeed: cyclePlaybackSpeed } = usePlaybackSpeed();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(memo.duration);
  const [likeCount, setLikeCount] = useState(memo.likes);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(y, [-200, 0, 200], [0.95, 1, 0.95]);

  // Initialize like count
  useEffect(() => {
    setInitialLikeCount(memo.id, memo.likes);
  }, [memo.id, memo.likes, setInitialLikeCount]);

  // Track view when card becomes active
  useEffect(() => {
    if (isActive) {
      supabase.rpc("increment_view_count", { memo_uuid: memo.id });
    }
  }, [isActive, memo.id]);

  // Pause audio when not active
  useEffect(() => {
    if (!isActive && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const initAudio = useCallback(() => {
    if (!memo.audioUrl || audioRef.current) return audioRef.current;
    
    const audio = new Audio(memo.audioUrl);
    audio.playbackRate = playbackSpeed;
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => setAudioDuration(audio.duration);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audioRef.current = audio;
    return audio;
  }, [memo.audioUrl, playbackSpeed]);

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

  const handleCycleSpeed = () => {
    cyclePlaybackSpeed();
    if (audioRef.current) {
      const speeds = [1, 1.2, 1.5, 2];
      const currentIndex = speeds.indexOf(playbackSpeed);
      const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Sign in to like memos");
      return;
    }
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
    if (!memo.author.id) return;
    
    const success = await toggleFollow(memo.author.id);
    if (success) {
      toast.success(isFollowing(memo.author.id) ? "Unfollowed" : "Following");
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (offset < -threshold || velocity < -500) {
      onSwipeUp();
    } else if (offset > threshold || velocity > 500) {
      onSwipeDown();
    }
    
    animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
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

  const isOwnMemo = user?.id === memo.author.id;
  const userIsFollowing = memo.author.id ? isFollowing(memo.author.id) : false;
  const memoIsLiked = isLiked(memo.id);

  return (
    <motion.div
      style={{ y, opacity, scale }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 flex flex-col justify-between px-6 py-8 touch-pan-x"
    >
      {/* Top Section - Author */}
      <div className="flex items-center justify-between">
        <Link 
          to={memo.author.id ? `/profile/${memo.author.id}` : "#"} 
          className="flex items-center gap-3 group"
        >
          {memo.author.avatar ? (
            <img
              src={memo.author.avatar}
              alt={memo.author.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-background/50"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold text-lg ring-2 ring-background/50">
              {memo.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {memo.author.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTimeAgo(memo.createdAt)}</span>
              {memo.language && LANGUAGE_DISPLAY[memo.language] && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {LANGUAGE_DISPLAY[memo.language].flag}
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>
        
        {!isOwnMemo && memo.author.id && (
          <Button
            variant={userIsFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollow}
            disabled={followLoading}
            className="rounded-full"
          >
            {userIsFollowing ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        )}
      </div>

      {/* Middle Section - Content */}
      <div className="flex-1 flex flex-col justify-center py-8">
        {/* Title */}
        <Link to={`/memo/${memo.id}`}>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight hover:text-primary transition-colors">
            {memo.title}
          </h2>
        </Link>

        {/* Audio Player - Large Centered */}
        {memo.audioUrl && (
          <div className="bg-card/80 backdrop-blur-sm rounded-3xl p-6 mb-6 border border-border/50">
            <div className="flex items-center gap-4 mb-4">
              <motion.button
                onClick={togglePlayback}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-glow"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 text-white" />
                ) : (
                  <Play className="h-6 w-6 text-white ml-1" />
                )}
              </motion.button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {formatDuration(currentTime)} / {formatDuration(audioDuration)}
                  </span>
                </div>
                <button
                  onClick={handleCycleSpeed}
                  className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors"
                >
                  {playbackSpeed}x speed
                </button>
              </div>
            </div>

            <AudioWaveform
              audioUrl={memo.audioUrl}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={audioDuration}
              onSeek={handleSeek}
            />
          </div>
        )}

        {/* Summary */}
        <p className="text-base text-muted-foreground leading-relaxed line-clamp-4">
          {memo.summary || memo.transcript.slice(0, 200)}
        </p>

        {/* Categories */}
        {memo.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {memo.categories.slice(0, 3).map((category) => (
              <span
                key={category}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section - Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Like Button */}
          <motion.button
            onClick={handleLike}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center gap-1"
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
              memoIsLiked 
                ? "bg-red-500/10 text-red-500" 
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}>
              <Heart className={cn("h-6 w-6", memoIsLiked && "fill-current")} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{likeCount}</span>
          </motion.button>

          {/* View Count */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Eye className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{memo.viewCount}</span>
          </div>
        </div>

        <ShareButton
          memoId={memo.id}
          title={memo.title}
          summary={memo.summary}
          isPublic={memo.isPublic}
        />
      </div>

      {/* Swipe Hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50">
        Swipe up for next
      </div>
    </motion.div>
  );
}
