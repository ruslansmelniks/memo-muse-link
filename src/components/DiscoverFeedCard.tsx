import { Heart, Eye, Bookmark, Play, Pause, ListPlus, Check, UserPlus, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DiscoverMemo } from "@/hooks/useDiscoverMemos";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useLikes } from "@/hooks/useLikes";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState, useMemo, useCallback, useRef } from "react";

interface DiscoverFeedCardProps {
  memo: DiscoverMemo;
  className?: string;
}

// Generate pseudo-random waveform bars based on memo id
function generateWaveformBars(id: string, count: number = 50): number[] {
  let seed = 0;
  for (let i = 0; i < id.length; i++) {
    seed = ((seed << 5) - seed) + id.charCodeAt(i);
    seed = seed & seed;
  }
  
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    // Create wave-like pattern with some randomness
    const wave = Math.sin((i / count) * Math.PI * 2) * 0.3 + 0.5;
    const random = (seed % 100) / 100;
    bars.push(0.2 + wave * 0.4 + random * 0.4);
  }
  return bars;
}

export function DiscoverFeedCard({ memo, className }: DiscoverFeedCardProps) {
  const { user } = useAuth();
  const { play, pause, isPlaying, isCurrentTrack, currentTime, duration, seek, addToQueue, isInQueue } = useAudioPlayer();
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmarks();
  const { isLiked, toggleLike } = useLikes();
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow();
  const [likeCount, setLikeCount] = useState(memo.likes);
  const waveformRef = useRef<HTMLDivElement>(null);

  const isThisTrack = isCurrentTrack(memo.id);
  const isThisTrackPlaying = isThisTrack && isPlaying;
  const isDemo = memo.id.startsWith("demo-");

  // Generate consistent waveform for this memo
  const waveformBars = useMemo(() => generateWaveformBars(memo.id, 60), [memo.id]);
  
  // Calculate progress percentage
  const progress = isThisTrack && duration > 0 
    ? (currentTime / duration) * 100 
    : 0;

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const memoLink = isDemo ? "#" : `/memo/${memo.id}`;
  const profileLink = isDemo || !memo.author.id ? "#" : `/profile/${memo.author.id}`;

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!memo.audioUrl) return;
    
    if (isThisTrackPlaying) {
      pause();
    } else {
      play({
        id: memo.id,
        title: memo.title,
        audioUrl: memo.audioUrl,
        author: memo.author,
        duration: memo.duration,
      });
    }
  };

  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!memo.audioUrl || !waveformRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * memo.duration;
    
    // If this is already the current track, just seek
    if (isThisTrack) {
      seek(seekTime);
    } else {
      // Start playing from beginning, then seek
      play({
        id: memo.id,
        title: memo.title,
        audioUrl: memo.audioUrl,
        author: memo.author,
        duration: memo.duration,
      });
      // Seek after a brief delay to allow audio to load
      setTimeout(() => seek(seekTime), 100);
    }
  }, [memo, play, seek, isThisTrack]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Sign in to like memos");
      return;
    }
    if (isDemo) return;
    
    const result = await toggleLike(memo.id, likeCount);
    if (result.success) {
      setLikeCount(result.newCount);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDemo) {
      toast.error("Demo memos cannot be saved");
      return;
    }
    await toggleBookmark(memo.id);
  };

  const memoIsLiked = isLiked(memo.id);
  const memoIsBookmarked = isBookmarked(memo.id);
  const authorIsFollowed = memo.author.id ? isFollowing(memo.author.id) : false;
  const isOwnMemo = user?.id === memo.author.id;

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Sign in to follow users");
      return;
    }
    
    if (!memo.author.id || isDemo || isOwnMemo) return;
    
    const success = await toggleFollow(memo.author.id);
    if (success) {
      toast.success(authorIsFollowed ? "Unfollowed" : "Following");
    }
  };

  return (
    <Card className={cn("border-0 shadow-none bg-transparent", className)}>
      <CardContent className="p-0">
        {/* Author Row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={profileLink}>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={memo.author.avatar} alt={memo.author.name} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {memo.author.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Link 
                to={profileLink}
                className="font-medium text-foreground hover:text-primary transition-colors truncate"
              >
                {memo.author.name}
              </Link>
              <span className="text-muted-foreground flex-shrink-0">·</span>
              <span className="text-muted-foreground flex-shrink-0">{formatTimeAgo(memo.createdAt)}</span>
            </div>
          </div>
          
          {/* Follow Button */}
          {memo.author.id && !isOwnMemo && !isDemo && (
            <Button
              variant={authorIsFollowed ? "outline" : "default"}
              size="sm"
              onClick={handleFollow}
              disabled={followLoading}
              className={cn(
                "h-7 px-3 text-xs font-medium flex-shrink-0",
                authorIsFollowed && "border-primary/30 text-primary hover:bg-primary/10"
              )}
            >
              {authorIsFollowed ? (
                <>
                  <UserCheck className="h-3 w-3 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>

        {/* Title */}
        <Link to={memoLink}>
          <h3 className="font-display font-semibold text-lg text-foreground leading-tight mb-2 hover:text-primary transition-colors line-clamp-2">
            {memo.title}
          </h3>
        </Link>

        {/* Summary/Excerpt */}
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-3">
          {memo.summary || memo.transcript.slice(0, 150)}
        </p>

        {/* SoundCloud-style Mini Player */}
        {memo.audioUrl && (
          <div className="bg-muted/30 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-3">
              {/* Play Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handlePlayToggle}
                className={cn(
                  "w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                  isThisTrackPlaying
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                )}
              >
                {isThisTrackPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </motion.button>

              {/* Waveform */}
              <div 
                ref={waveformRef}
                onClick={handleWaveformClick}
                className="flex-1 h-10 flex items-end gap-[2px] cursor-pointer group"
              >
                {waveformBars.map((height, i) => {
                  const barProgress = (i / waveformBars.length) * 100;
                  const isPlayed = barProgress < progress;
                  const isCurrentBar = Math.abs(barProgress - progress) < 2;
                  
                  return (
                    <motion.div
                      key={i}
                      animate={
                        isThisTrackPlaying
                          ? {
                              scaleY: [1, 0.6 + Math.random() * 0.8, 1],
                              transition: {
                                duration: 0.4 + Math.random() * 0.3,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.02,
                              },
                            }
                          : { scaleY: 1 }
                      }
                      className={cn(
                        "flex-1 min-w-[2px] max-w-[4px] rounded-full transition-colors origin-bottom",
                        isPlayed 
                          ? "bg-primary" 
                          : "bg-foreground/20 group-hover:bg-foreground/30",
                        isCurrentBar && isThisTrack && "bg-primary"
                      )}
                      style={{ 
                        height: `${height * 100}%`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Duration + Queue */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-xs text-muted-foreground tabular-nums min-w-[36px] text-right">
                  {isThisTrack 
                    ? formatDuration(currentTime)
                    : formatDuration(memo.duration)
                  }
                </div>
                
                {/* Add to Queue */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!memo.audioUrl) return;
                    
                    const inQueue = isInQueue(memo.id);
                    if (inQueue) {
                      toast.info("Already in queue");
                      return;
                    }
                    
                    addToQueue({
                      id: memo.id,
                      title: memo.title,
                      audioUrl: memo.audioUrl,
                      author: memo.author,
                      duration: memo.duration,
                    });
                    toast.success("Added to queue");
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isInQueue(memo.id)
                      ? "bg-primary/20 text-primary"
                      : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  )}
                >
                  {isInQueue(memo.id) ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <ListPlus className="h-3.5 w-3.5" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Row: Categories + Actions */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Categories */}
          <div className="flex items-center gap-2 flex-wrap">
            {memo.categories.slice(0, 2).map((category) => (
              <Badge 
                key={category} 
                variant="secondary"
                className="text-xs font-normal"
              >
                {category}
              </Badge>
            ))}
            {!memo.audioUrl && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(memo.duration)}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {/* Like */}
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 transition-colors hover:text-primary",
                memoIsLiked && "text-primary"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", memoIsLiked && "fill-current")} />
              <span>{likeCount}</span>
            </button>
            
            {/* Views */}
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{memo.viewCount}</span>
            </div>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className={cn(
                "flex items-center transition-colors hover:text-primary",
                memoIsBookmarked && "text-primary"
              )}
            >
              <Bookmark className={cn("h-3.5 w-3.5", memoIsBookmarked && "fill-current")} />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
