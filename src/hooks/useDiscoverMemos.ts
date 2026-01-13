import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DiscoverFeed = "trending" | "recent" | "following";

export interface DiscoverMemo {
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
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  viewCount: number;
  language: string | null;
}

interface UseDiscoverMemosOptions {
  feed: DiscoverFeed;
  category?: string | null;
  searchQuery?: string;
  limit?: number;
}

export function useDiscoverMemos(options: UseDiscoverMemosOptions) {
  const { feed, category, searchQuery, limit = 20 } = options;
  const { user } = useAuth();
  const [memos, setMemos] = useState<DiscoverMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // Load following list for the "following" feed
  useEffect(() => {
    if (!user || feed !== "following") return;

    async function loadFollowing() {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!error && data) {
        setFollowingIds(data.map(f => f.following_id));
      }
    }

    loadFollowing();
  }, [user, feed]);

  const loadMemos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("memos")
        .select(`
          id,
          title,
          audio_url,
          transcript,
          summary,
          categories,
          tasks,
          is_public,
          created_at,
          duration,
          user_id,
          author_name,
          likes,
          view_count,
          language
        `)
        .eq("is_public", true)
        .limit(limit);

      // Apply feed-specific ordering
      if (feed === "trending") {
        // Trending: Sort by likes + view_count, weighted toward recent
        query = query
          .order("likes", { ascending: false })
          .order("created_at", { ascending: false });
      } else if (feed === "recent") {
        query = query.order("created_at", { ascending: false });
      } else if (feed === "following") {
        if (followingIds.length === 0) {
          setMemos([]);
          setLoading(false);
          return;
        }
        query = query
          .in("user_id", followingIds)
          .order("created_at", { ascending: false });
      }

      // Apply category filter
      if (category) {
        query = query.contains("categories", [category]);
      }

      // Apply search filter
      if (searchQuery?.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,transcript.ilike.%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!data) {
        setMemos([]);
        setLoading(false);
        return;
      }

      // Fetch author profiles
      const userIds = [...new Set(data.map(m => m.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { name: p.display_name, avatar: p.avatar_url }]) || []
      );

      const mappedMemos: DiscoverMemo[] = data.map(m => ({
        id: m.id,
        title: m.title,
        audioUrl: m.audio_url,
        transcript: m.transcript,
        summary: m.summary,
        categories: m.categories || [],
        tasks: m.tasks || [],
        isPublic: m.is_public,
        createdAt: new Date(m.created_at),
        duration: m.duration,
        author: {
          id: m.user_id || "",
          name: profileMap.get(m.user_id || "")?.name || m.author_name || "Anonymous",
          avatar: profileMap.get(m.user_id || "")?.avatar || undefined,
        },
        likes: m.likes,
        viewCount: m.view_count,
        language: m.language,
      }));

      setMemos(mappedMemos);
    } catch (err) {
      console.error("Error loading discover memos:", err);
      setError("Failed to load memos");
    } finally {
      setLoading(false);
    }
  }, [feed, category, searchQuery, limit, followingIds]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  const refresh = useCallback(() => {
    loadMemos();
  }, [loadMemos]);

  return {
    memos,
    loading,
    error,
    refresh,
  };
}
