import { useState, useCallback } from "react";
import { Compass, TrendingUp, Clock, Users, Search, X, Eye, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDiscoverMemos, DiscoverFeed, DiscoverMemo } from "@/hooks/useDiscoverMemos";
import { useFollow } from "@/hooks/useFollow";
import { useLikes } from "@/hooks/useLikes";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/AudioWaveform";
import { ShareButton } from "@/components/ShareButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, UserPlus, UserMinus } from "lucide-react";
import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const FEEDS: { id: DiscoverFeed; label: string; icon: React.ElementType }[] = [
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "following", label: "Following", icon: Users },
];

const CATEGORIES = [
  "All",
  "Ideas",
  "Work",
  "Learning",
  "Personal",
  "Creative",
  "Goals",
  "Reflections",
];

const LANGUAGE_DISPLAY: Record<string, { flag: string; short: string }> = {
  "en-US": { flag: "🇺🇸", short: "EN" },
  "ru-RU": { flag: "🇷🇺", short: "RU" },
  "uk-UA": { flag: "🇺🇦", short: "UA" },
  "es-ES": { flag: "🇪🇸", short: "ES" },
  "fr-FR": { flag: "🇫🇷", short: "FR" },
  "de-DE": { flag: "🇩🇪", short: "DE" },
  "auto": { flag: "🌐", short: "Auto" },
};

export function DiscoverView() {
  const { user } = useAuth();
  const [activeFeed, setActiveFeed] = useState<DiscoverFeed>("trending");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { memos, loading, refresh } = useDiscoverMemos({
    feed: activeFeed,
    category: selectedCategory === "All" ? null : selectedCategory,
    searchQuery: debouncedSearch,
  });

  const handleFeedChange = (feed: DiscoverFeed) => {
    if (feed === "following" && !user) {
      toast.error("Sign in to see memos from people you follow");
      return;
    }
    setActiveFeed(feed);
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
            <Compass className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">
              Discover
            </h2>
            <p className="text-muted-foreground text-sm">
              Explore public voice memos from the community
            </p>
          </div>
        </div>
      </div>

      {/* Feed Tabs */}
      <div className="flex gap-2 mb-4 animate-fade-in" style={{ animationDelay: "50ms" }}>
        {FEEDS.map((feed) => {
          const Icon = feed.icon;
          const isActive = activeFeed === feed.id;
          return (
            <button
              key={feed.id}
              onClick={() => handleFeedChange(feed.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                isActive
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="h-4 w-4" />
              {feed.label}
            </button>
          );
        })}
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide animate-fade-in" style={{ animationDelay: "100ms" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat === "All" ? null : cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              (cat === "All" && !selectedCategory) || selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search public memos..."
          className="w-full pl-12 pr-10 py-3 rounded-2xl bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 border border-border/50 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="h-5 w-3/4 bg-muted rounded mb-3" />
              <div className="h-16 bg-muted rounded-xl mb-4" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {!loading && memos.length === 0 && (
        <div className="text-center py-12">
          {activeFeed === "following" ? (
            <>
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No memos yet</h3>
              <p className="text-muted-foreground">
                {user ? "Follow some creators to see their memos here" : "Sign in to follow creators"}
              </p>
            </>
          ) : (
            <>
              <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No memos found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Be the first to share a public memo!"}
              </p>
            </>
          )}
        </div>
      )}

      {/* Memo Cards */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {memos.map((memo, index) => (
            <DiscoverMemoCard
              key={memo.id}
              memo={memo}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Discover Memo Card Component
interface DiscoverMemoCardProps {
  memo: DiscoverMemo;
  index: number;
}

function DiscoverMemoCard({ memo, index }: DiscoverMemoCardProps) {
  const { user } = useAuth();
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow();
  const { isLiked, toggleLike, setInitialLikeCount, getLikeCount } = useLikes();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(memo.duration);
  const [likeCount, setLikeCount] = useState(memo.likes);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize like count
  useEffect(() => {
    setInitialLikeCount(memo.id, memo.likes);
  }, [memo.id, memo.likes, setInitialLikeCount]);

  // Track view count when card comes into view
  useEffect(() => {
    const incrementView = async () => {
      await supabase.rpc("increment_view_count", { memo_uuid: memo.id });
    };
    incrementView();
  }, [memo.id]);

  const initAudio = useCallback(() => {
    if (!memo.audioUrl || audioRef.current) return audioRef.current;
    
    const audio = new Audio(memo.audioUrl);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => setAudioDuration(audio.duration);
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="bg-card rounded-2xl p-6 border border-border/50 transition-colors duration-200 hover:border-border"
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
        
        {/* Follow Button */}
        {!isOwnMemo && memo.author.id && (
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
      </div>

      {/* Title */}
      <Link to={`/memo/${memo.id}`}>
        <h3 className="font-display font-semibold text-foreground mb-4 hover:text-primary transition-colors">
          {memo.title}
        </h3>
      </Link>

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

            <div className="text-xs text-muted-foreground font-medium flex-shrink-0">
              {formatDuration(currentTime)} / {formatDuration(audioDuration)}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3">
        {memo.summary || memo.transcript.slice(0, 150)}
      </p>

      {/* Categories */}
      {memo.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {memo.categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            >
              {category}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Stats and Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
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

        <ShareButton
          memoId={memo.id}
          title={memo.title}
          summary={memo.summary}
          isPublic={memo.isPublic}
        />
      </div>
    </motion.div>
  );
}
