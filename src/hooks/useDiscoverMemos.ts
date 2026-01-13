import { useState, useEffect, useCallback, useRef } from "react";
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
  categories?: string[];
  searchQuery?: string;
  pageSize?: number;
}

export function useDiscoverMemos(options: UseDiscoverMemosOptions) {
  const { feed, categories = [], searchQuery, pageSize = 10 } = options;
  const { user } = useAuth();
  const [memos, setMemos] = useState<DiscoverMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const offsetRef = useRef(0);

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

  const fetchMemos = useCallback(async (offset: number, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
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
        .range(offset, offset + pageSize - 1);

      // Apply feed-specific ordering
      if (feed === "trending") {
        query = query
          .order("likes", { ascending: false })
          .order("created_at", { ascending: false });
      } else if (feed === "recent") {
        query = query.order("created_at", { ascending: false });
      } else if (feed === "following") {
        if (followingIds.length === 0) {
          setMemos([]);
          setLoading(false);
          setLoadingMore(false);
          setHasMore(false);
          return;
        }
        query = query
          .in("user_id", followingIds)
          .order("created_at", { ascending: false });
      }

      // Apply category filter (supports multiple categories with OR logic)
      if (categories.length > 0) {
        // Use overlaps to match any of the selected categories
        query = query.overlaps("categories", categories);
      }

      // Apply search filter
      if (searchQuery?.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,transcript.ilike.%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!data) {
        if (!isLoadMore) setMemos([]);
        setHasMore(false);
        return;
      }

      // Check if we have more data
      setHasMore(data.length === pageSize);

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

      if (isLoadMore) {
        setMemos(prev => [...prev, ...mappedMemos]);
      } else {
        setMemos(mappedMemos);
      }
    } catch (err) {
      console.error("Error loading discover memos:", err);
      setError("Failed to load memos");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feed, categories, searchQuery, pageSize, followingIds]);

  // Reset and load when filters change
  useEffect(() => {
    offsetRef.current = 0;
    setHasMore(true);
    fetchMemos(0, false);
  }, [fetchMemos]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const newOffset = offsetRef.current + pageSize;
    offsetRef.current = newOffset;
    fetchMemos(newOffset, true);
  }, [fetchMemos, loadingMore, hasMore, pageSize]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    setHasMore(true);
    fetchMemos(0, false);
  }, [fetchMemos]);

  return {
    memos,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

// Fetch a random public memo
export async function fetchRandomMemo(): Promise<DiscoverMemo | null> {
  try {
    // Get count of public memos
    const { count } = await supabase
      .from("memos")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true);

    if (!count || count === 0) return null;

    // Get random offset
    const randomOffset = Math.floor(Math.random() * count);

    const { data, error } = await supabase
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
      .range(randomOffset, randomOffset)
      .single();

    if (error || !data) return null;

    // Fetch author profile
    let authorInfo = { name: data.author_name || "Anonymous", avatar: undefined as string | undefined };
    if (data.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", data.user_id)
        .single();
      
      if (profile) {
        authorInfo = { 
          name: profile.display_name || data.author_name || "Anonymous", 
          avatar: profile.avatar_url || undefined 
        };
      }
    }

    return {
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
      author: {
        id: data.user_id || "",
        ...authorInfo,
      },
      likes: data.likes,
      viewCount: data.view_count,
      language: data.language,
    };
  } catch (err) {
    console.error("Error fetching random memo:", err);
    return null;
  }
}
