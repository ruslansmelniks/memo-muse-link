import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, Play, Pause, Heart, Eye, Loader2, Share2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { useLikes } from "@/hooks/useLikes";
import { usePlaybackSpeed } from "@/hooks/usePlaybackSpeed";
import { Button } from "@/components/ui/button";
import { AudioWaveform } from "@/components/AudioWaveform";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AuthorProfile {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

interface AuthorMemo {
  id: string;
  title: string;
  audioUrl: string | null;
  transcript: string;
  summary: string | null;
  categories: string[];
  createdAt: Date;
  duration: number;
  likes: number;
  viewCount: number;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { isFollowing, toggleFollow, getFollowerCount, getFollowingCount, loading: followLoading } = useFollow();
  const { isLiked, toggleLike, setInitialLikeCount } = useLikes();
  
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [memos, setMemos] = useState<AuthorMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function loadProfile() {
      setLoading(true);

      // Check if userId is a username (starts with @) or a UUID
      const isUsername = userId.startsWith("@");
      const lookupValue = isUsername ? userId.slice(1) : userId;

      // Load profile
      let profileQuery = supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, bio");

      if (isUsername) {
        profileQuery = profileQuery.eq("username", lookupValue);
      } else {
        profileQuery = profileQuery.eq("user_id", lookupValue);
      }

      const { data: profileData } = await profileQuery.maybeSingle();

      if (profileData) {
        setProfile({
          userId: profileData.user_id,
          displayName: profileData.display_name || "Anonymous",
          username: profileData.username,
          avatarUrl: profileData.avatar_url,
          bio: profileData.bio,
        });

        // Load public memos using the resolved user_id
        const { data: memosData } = await supabase
          .from("memos")
          .select("id, title, audio_url, transcript, summary, categories, created_at, duration, likes, view_count")
          .eq("user_id", profileData.user_id)
          .eq("is_public", true)
          .order("created_at", { ascending: false });

        if (memosData) {
          setMemos(memosData.map(m => ({
            id: m.id,
            title: m.title,
            audioUrl: m.audio_url,
            transcript: m.transcript,
            summary: m.summary,
            categories: m.categories || [],
            createdAt: new Date(m.created_at),
            duration: m.duration,
            likes: m.likes,
            viewCount: m.view_count,
          })));
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [userId]);

  // Load follower/following counts
  useEffect(() => {
    if (!profile?.userId) return;

    async function loadCounts() {
      const [followers, following] = await Promise.all([
        getFollowerCount(profile!.userId),
        getFollowingCount(profile!.userId),
      ]);
      setFollowerCount(followers);
      setFollowingCount(following);
    }

    loadCounts();
  }, [profile?.userId, getFollowerCount, getFollowingCount]);

  const handleFollow = async () => {
    if (!user) {
      toast.error("Sign in to follow creators");
      return;
    }
    if (!profile?.userId) return;

    const wasFollowing = isFollowing(profile.userId);
    const success = await toggleFollow(profile.userId);
    if (success) {
      setFollowerCount(prev => wasFollowing ? prev - 1 : prev + 1);
      toast.success(wasFollowing ? "Unfollowed" : "Following");
    }
  };

  const handleShareProfile = async () => {
    const profilePath = profile?.username 
      ? `/profile/@${profile.username}` 
      : `/profile/${profile?.userId}`;
    const profileUrl = `${window.location.origin}${profilePath}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: profile?.displayName || "Profile",
          text: `Check out ${profile?.displayName}'s profile on MemoMuse`,
          url: profileUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(profileUrl);
      setLinkCopied(true);
      toast.success("Profile link copied");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const isOwnProfile = user?.id === profile?.userId;
  const userIsFollowing = profile?.userId ? isFollowing(profile.userId) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Users className="h-12 w-12 text-muted-foreground" />
        <h1 className="font-display text-xl font-semibold">Profile not found</h1>
        <Link to="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display font-semibold text-lg">Profile</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-8">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full object-cover mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-3xl mb-4">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          
          <h2 className="font-display text-2xl font-bold mb-1">{profile.displayName}</h2>
          
          {profile.username && (
            <p className="text-muted-foreground text-sm mb-2">@{profile.username}</p>
          )}
          
          {profile.bio && (
            <p className="text-muted-foreground text-sm max-w-md mb-4">{profile.bio}</p>
          )}
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
            <div>
              <span className="font-semibold text-foreground">{followerCount}</span> followers
            </div>
            <div>
              <span className="font-semibold text-foreground">{followingCount}</span> following
            </div>
            <div>
              <span className="font-semibold text-foreground">{memos.length}</span> memos
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isOwnProfile && (
              <Button
                variant={userIsFollowing ? "outline" : "default"}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {userIsFollowing ? "Following" : "Follow"}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleShareProfile}
            >
              {linkCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Memos */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-lg">Public Memos</h3>
          
          {memos.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No public memos yet</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {memos.map((memo, index) => (
                <ProfileMemoCard
                  key={memo.id}
                  memo={memo}
                  index={index}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

// Profile Memo Card Component
interface ProfileMemoCardProps {
  memo: AuthorMemo;
  index: number;
}

function ProfileMemoCard({ memo, index }: ProfileMemoCardProps) {
  const { user } = useAuth();
  const { isLiked, toggleLike, setInitialLikeCount } = useLikes();
  const { speed: playbackSpeed, cycleSpeed } = usePlaybackSpeed();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(memo.duration);
  const [likeCount, setLikeCount] = useState(memo.likes);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setInitialLikeCount(memo.id, memo.likes);
  }, [memo.id, memo.likes, setInitialLikeCount]);

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
    cycleSpeed();
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const memoIsLiked = isLiked(memo.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card rounded-2xl p-6 border border-border/50"
    >
      <Link to={`/memo/${memo.id}`}>
        <h3 className="font-display font-semibold text-foreground mb-4 hover:text-primary transition-colors">
          {memo.title}
        </h3>
      </Link>

      {memo.audioUrl && (
        <div className="bg-muted/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={togglePlayback}
              whileTap={{ scale: 0.92 }}
              className="w-12 h-12 min-w-[48px] rounded-full bg-foreground/10 flex items-center justify-center"
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
                onClick={handleCycleSpeed}
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

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {memo.summary || memo.transcript.slice(0, 100)}
      </p>

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

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={cn(
            "text-muted-foreground hover:text-primary",
            memoIsLiked && "text-red-500 hover:text-red-600"
          )}
        >
          <Heart className={cn("h-4 w-4 mr-1", memoIsLiked && "fill-current")} />
          {likeCount}
        </Button>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          {memo.viewCount}
        </div>
      </div>
    </motion.div>
  );
}
