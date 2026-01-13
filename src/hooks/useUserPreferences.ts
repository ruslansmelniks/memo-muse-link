import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserPreferences {
  followingIds: Set<string>;
  categoryWeights: Map<string, number>;
  topCategories: string[];
  isLoaded: boolean;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    followingIds: new Set(),
    categoryWeights: new Map(),
    topCategories: [],
    isLoaded: false,
  });

  useEffect(() => {
    if (!user) {
      setPreferences({
        followingIds: new Set(),
        categoryWeights: new Map(),
        topCategories: [],
        isLoaded: true,
      });
      return;
    }

    async function loadPreferences() {
      const categoryCount = new Map<string, number>();

      // Load who the user follows
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = new Set(follows?.map((f) => f.following_id) || []);

      // Load categories from user's own memos (weighted x1)
      const { data: ownMemos } = await supabase
        .from("memos")
        .select("categories")
        .eq("user_id", user.id)
        .not("categories", "is", null);

      ownMemos?.forEach((m) => {
        (m.categories || []).forEach((cat: string) => {
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
        });
      });

      // Load categories from liked memos (weighted x2 - stronger signal)
      const { data: likedMemos } = await supabase
        .from("memo_likes")
        .select("memo_id")
        .eq("user_id", user.id);

      if (likedMemos && likedMemos.length > 0) {
        const { data: likedMemoDetails } = await supabase
          .from("memos")
          .select("categories")
          .in("id", likedMemos.map((l) => l.memo_id))
          .not("categories", "is", null);

        likedMemoDetails?.forEach((m) => {
          (m.categories || []).forEach((cat: string) => {
            categoryCount.set(cat, (categoryCount.get(cat) || 0) + 2);
          });
        });
      }

      // Load categories from bookmarked memos (weighted x3 - strongest signal)
      const { data: bookmarkedMemos } = await supabase
        .from("bookmarks")
        .select("memo_id")
        .eq("user_id", user.id);

      if (bookmarkedMemos && bookmarkedMemos.length > 0) {
        const { data: bookmarkedMemoDetails } = await supabase
          .from("memos")
          .select("categories")
          .in("id", bookmarkedMemos.map((b) => b.memo_id))
          .not("categories", "is", null);

        bookmarkedMemoDetails?.forEach((m) => {
          (m.categories || []).forEach((cat: string) => {
            categoryCount.set(cat, (categoryCount.get(cat) || 0) + 3);
          });
        });
      }

      // Sort categories by weight
      const topCategories = [...categoryCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat);

      setPreferences({
        followingIds,
        categoryWeights: categoryCount,
        topCategories,
        isLoaded: true,
      });
    }

    loadPreferences();
  }, [user]);

  const refreshPreferences = useCallback(async () => {
    if (!user) return;
    
    // Trigger a re-load by resetting isLoaded
    setPreferences((prev) => ({ ...prev, isLoaded: false }));
  }, [user]);

  return { ...preferences, refreshPreferences };
}
