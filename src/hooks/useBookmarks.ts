import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch user's bookmarks on mount
  useEffect(() => {
    if (!user) {
      setBookmarkedIds(new Set());
      return;
    }

    async function fetchBookmarks() {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("memo_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setBookmarkedIds(new Set(data.map((b) => b.memo_id)));
      }
    }

    fetchBookmarks();
  }, [user]);

  const isBookmarked = useCallback(
    (memoId: string) => bookmarkedIds.has(memoId),
    [bookmarkedIds]
  );

  const toggleBookmark = useCallback(
    async (memoId: string) => {
      if (!user) {
        toast.error("Sign in to save memos");
        return false;
      }

      setLoading(true);
      const currentlyBookmarked = bookmarkedIds.has(memoId);

      try {
        if (currentlyBookmarked) {
          // Remove bookmark
          const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", user.id)
            .eq("memo_id", memoId);

          if (error) throw error;

          setBookmarkedIds((prev) => {
            const next = new Set(prev);
            next.delete(memoId);
            return next;
          });
          toast.success("Removed from saved");
        } else {
          // Add bookmark
          const { error } = await supabase
            .from("bookmarks")
            .insert({ user_id: user.id, memo_id: memoId });

          if (error) throw error;

          setBookmarkedIds((prev) => new Set(prev).add(memoId));
          toast.success("Saved for later");
        }

        return true;
      } catch (error) {
        console.error("Bookmark error:", error);
        toast.error("Failed to update bookmark");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user, bookmarkedIds]
  );

  return {
    isBookmarked,
    toggleBookmark,
    loading,
    bookmarkedIds,
  };
}
