import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "./useUserPreferences";

export type DiscoverFeed = "for-you" | "trending" | "recent" | "following";

export type RecommendationReason = {
  type: "similar-topic" | "following" | "interest" | "trending" | "recent";
  text: string;
  category?: string;
  authorName?: string;
};

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
  recommendationReason?: RecommendationReason;
}

interface UseDiscoverMemosOptions {
  feed: DiscoverFeed;
  categories?: string[];
  searchQuery?: string;
  pageSize?: number;
}

interface ScoredMemo {
  memo: DiscoverMemo;
  score: number;
  reason: RecommendationReason;
}

// Score a memo based on user preferences and return reason
function calculateMemoScoreWithReason(
  memo: DiscoverMemo,
  followingIds: Set<string>,
  followingNames: Map<string, string>,
  categoryWeights: Map<string, number>,
  topCategories: string[],
  ownCategories: Set<string>,
  likedCategories: Set<string>
): { score: number; reason: RecommendationReason } {
  let score = 0;
  let reason: RecommendationReason = { type: "trending", text: "Trending in the community" };
  let reasonPriority = 0; // Higher = more important
  
  // Check for similar topic to user's own memos (HIGHEST priority)
  const matchingOwnCategory = memo.categories.find((cat) => ownCategories.has(cat));
  if (matchingOwnCategory) {
    score += 150; // Highest bonus
    if (reasonPriority < 100) {
      reason = {
        type: "similar-topic",
        text: `Similar to your memos about ${matchingOwnCategory}`,
        category: matchingOwnCategory,
      };
      reasonPriority = 100;
    }
  }
  
  // Following bonus (second highest priority)
  if (followingIds.has(memo.author.id)) {
    score += 100;
    if (reasonPriority < 90) {
      const authorName = followingNames.get(memo.author.id) || memo.author.name;
      reason = {
        type: "following",
        text: `Because you follow ${authorName}`,
        authorName,
      };
      reasonPriority = 90;
    }
  }
  
  // Category match from liked memos
  const matchingLikedCategory = memo.categories.find((cat) => likedCategories.has(cat));
  if (matchingLikedCategory) {
    score += 50;
    if (reasonPriority < 80) {
      reason = {
        type: "interest",
        text: `Based on your interest in ${matchingLikedCategory}`,
        category: matchingLikedCategory,
      };
      reasonPriority = 80;
    }
  }
  
  // Category match bonus (based on weighted preferences)
  memo.categories.forEach((cat) => {
    const weight = categoryWeights.get(cat) || 0;
    score += weight * 10;
  });
  
  // Top category match bonus
  const topThree = topCategories.slice(0, 3);
  const matchingTopCategory = memo.categories.find((cat) => topThree.includes(cat));
  if (matchingTopCategory) {
    score += 25;
    if (reasonPriority < 70) {
      reason = {
        type: "interest",
        text: `Based on your interest in ${matchingTopCategory}`,
        category: matchingTopCategory,
      };
      reasonPriority = 70;
    }
  }
  
  // Engagement bonus (normalized)
  score += Math.min(memo.likes * 2, 50);
  score += Math.min(memo.viewCount * 0.1, 20);
  
  // Recency bonus
  const hoursSinceCreation = (Date.now() - memo.createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation < 24) {
    score += 30 * (1 - hoursSinceCreation / 24);
    if (reasonPriority < 50 && hoursSinceCreation < 6) {
      reason = { type: "recent", text: "New memo posted recently" };
      reasonPriority = 50;
    }
  } else if (hoursSinceCreation < 72) {
    score += 15 * (1 - (hoursSinceCreation - 24) / 48);
  }
  
  return { score, reason };
}

export function useDiscoverMemos(options: UseDiscoverMemosOptions) {
  const { feed, categories = [], searchQuery, pageSize = 20 } = options;
  const { user } = useAuth();
  const { 
    followingIds, 
    followingNames,
    categoryWeights, 
    topCategories, 
    ownCategories,
    likedCategories,
    isLoaded: preferencesLoaded 
  } = useUserPreferences();
  const [memos, setMemos] = useState<DiscoverMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [followingIdsForFeed, setFollowingIdsForFeed] = useState<string[]>([]);
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
        setFollowingIdsForFeed(data.map((f) => f.following_id));
      }
    }

    loadFollowing();
  }, [user, feed]);

  const fetchMemos = useCallback(
    async (offset: number, isLoadMore: boolean = false) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        // For "for-you" feed, we fetch more and score client-side
        const fetchSize = feed === "for-you" ? Math.max(pageSize * 3, 60) : pageSize;
        
        let query = supabase
          .from("memos")
          .select(
            `
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
          `
          )
          .eq("is_public", true);

        // Apply feed-specific filtering and ordering
        if (feed === "for-you") {
          // Fetch a broader set for scoring
          if (user) {
            query = query.neq("user_id", user.id); // Exclude own memos
          }
          // Get recent memos with some engagement for better scoring pool
          query = query
            .order("created_at", { ascending: false })
            .limit(fetchSize);
        } else if (feed === "trending") {
          query = query
            .order("likes", { ascending: false })
            .order("created_at", { ascending: false })
            .range(offset, offset + pageSize - 1);
        } else if (feed === "recent") {
          query = query
            .order("created_at", { ascending: false })
            .range(offset, offset + pageSize - 1);
        } else if (feed === "following") {
          if (followingIdsForFeed.length === 0) {
            setMemos([]);
            setLoading(false);
            setLoadingMore(false);
            setHasMore(false);
            return;
          }
          query = query
            .in("user_id", followingIdsForFeed)
            .order("created_at", { ascending: false })
            .range(offset, offset + pageSize - 1);
        }

        // Apply additional category filter (supports multiple categories with OR logic)
        if (categories.length > 0) {
          query = query.overlaps("categories", categories);
        }

        // Apply search filter
        if (searchQuery?.trim()) {
          query = query.or(
            `title.ilike.%${searchQuery}%,transcript.ilike.%${searchQuery}%`
          );
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
        const userIds = [...new Set(data.map((m) => m.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          profiles?.map((p) => [
            p.user_id,
            { name: p.display_name, avatar: p.avatar_url },
          ]) || []
        );

        let mappedMemos: DiscoverMemo[] = data.map((m) => ({
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
            name:
              profileMap.get(m.user_id || "")?.name || m.author_name || "Anonymous",
            avatar: profileMap.get(m.user_id || "")?.avatar || undefined,
          },
          likes: m.likes,
          viewCount: m.view_count,
          language: m.language,
        }));

        // For "for-you" feed, score and sort memos
        if (feed === "for-you" && preferencesLoaded) {
          // Score each memo with reasons
          const scoredMemos: ScoredMemo[] = mappedMemos.map((memo) => {
            const { score, reason } = calculateMemoScoreWithReason(
              memo, 
              followingIds, 
              followingNames,
              categoryWeights, 
              topCategories,
              ownCategories,
              likedCategories
            );
            return { memo: { ...memo, recommendationReason: reason }, score, reason };
          });
          
          // Sort by score descending
          scoredMemos.sort((a, b) => b.score - a.score);
          
          // Take the page slice
          const start = offset;
          const end = offset + pageSize;
          mappedMemos = scoredMemos.slice(start, end).map((s) => s.memo);
          
          // Check if we have more
          setHasMore(scoredMemos.length > end);
        }

        if (isLoadMore) {
          setMemos((prev) => [...prev, ...mappedMemos]);
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
    },
    [feed, categories, searchQuery, pageSize, followingIdsForFeed, followingIds, followingNames, categoryWeights, topCategories, ownCategories, likedCategories, preferencesLoaded, user]
  );

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
