import { useEffect } from "react";
import { Bookmark, Play, Pause, Heart, Eye, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useBookmarks, BookmarkedMemo } from "@/hooks/useBookmarks";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";

function SavedMemoCard({ memo }: { memo: BookmarkedMemo }) {
  const { play, pause, isPlaying, isCurrentTrack, currentTime, duration } = useAudioPlayer();
  const { toggleBookmark } = useBookmarks();

  const isThisTrack = isCurrentTrack(memo.id);
  const isThisTrackPlaying = isThisTrack && isPlaying;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark(memo.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
    >
      <Card className="border border-border/50 hover:border-border transition-colors">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Play Button */}
            {memo.audioUrl && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handlePlayToggle}
                className={cn(
                  "w-12 h-12 min-w-[48px] rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                  isThisTrackPlaying
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                {isThisTrackPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </motion.button>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <Link to={`/memo/${memo.id}`}>
                  <h4 className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                    {memo.title}
                  </h4>
                </Link>
                <button
                  onClick={handleRemove}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Link to={memo.author.id ? `/profile/${memo.author.id}` : "#"} className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={memo.author.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {memo.author.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{memo.author.name}</span>
                </Link>
                <span>·</span>
                <span className="flex-shrink-0">
                  {isThisTrack ? formatDuration(currentTime) : formatDuration(memo.duration)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {memo.categories.slice(0, 2).map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{memo.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{memo.viewCount}</span>
                  </div>
                  <span className="text-muted-foreground/60">
                    Saved {formatTimeAgo(memo.bookmarkedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SavedMemosSection() {
  const { bookmarkedMemos, fetchBookmarkedMemos, loadingMemos } = useBookmarks();

  useEffect(() => {
    fetchBookmarkedMemos();
  }, [fetchBookmarkedMemos]);

  if (loadingMemos) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading saved memos...</p>
      </div>
    );
  }

  if (bookmarkedMemos.length === 0) {
    return (
      <div className="text-center py-12">
        <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-display font-semibold text-lg mb-2">No saved memos</h3>
        <p className="text-muted-foreground">
          Save memos from Discover to listen to later
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {bookmarkedMemos.map((memo) => (
          <SavedMemoCard key={memo.id} memo={memo} />
        ))}
      </AnimatePresence>
    </div>
  );
}