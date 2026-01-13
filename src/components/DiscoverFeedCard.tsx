import { Heart, Eye, Headphones, Bookmark, Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DiscoverMemo } from "@/hooks/useDiscoverMemos";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useLikes } from "@/hooks/useLikes";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";

interface DiscoverFeedCardProps {
  memo: DiscoverMemo;
  className?: string;
}

export function DiscoverFeedCard({ memo, className }: DiscoverFeedCardProps) {
  const { user } = useAuth();
  const { play, pause, isPlaying, isCurrentTrack } = useAudioPlayer();
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmarks();
  const { isLiked, toggleLike } = useLikes();
  const [likeCount, setLikeCount] = useState(memo.likes);

  const isThisTrackPlaying = isCurrentTrack(memo.id) && isPlaying;
  const isDemo = memo.id.startsWith("demo-");

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

  return (
    <Card className={cn("border-0 shadow-none bg-transparent", className)}>
      <CardContent className="p-0">
        {/* Author Row */}
        <div className="flex items-center gap-3 mb-3">
          <Link to={profileLink}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={memo.author.avatar} alt={memo.author.name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {memo.author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link 
              to={profileLink}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {memo.author.name}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{formatTimeAgo(memo.createdAt)}</span>
          </div>
        </div>

        {/* Title */}
        <Link to={memoLink}>
          <h3 className="font-display font-semibold text-lg text-foreground leading-tight mb-2 hover:text-primary transition-colors line-clamp-2">
            {memo.title}
          </h3>
        </Link>

        {/* Summary/Excerpt */}
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-3">
          {memo.summary || memo.transcript.slice(0, 200)}
        </p>

        {/* Bottom Row: Categories + Audio + Actions */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Categories + Audio player */}
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
            {memo.audioUrl && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayToggle}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors",
                  isThisTrackPlaying
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isThisTrackPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                <span>{formatDuration(memo.duration)}</span>
              </motion.button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
