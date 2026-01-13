import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BookmarkedMemo {
  id: string;
  title: string;
  audioUrl: string | null;
  transcript: string;
  summary: string | null;
  categories: string[];
  duration: number;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  viewCount: number;
  bookmarkedAt: Date;
}

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkedMemos, setBookmarkedMemos] = useState<BookmarkedMemo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMemos, setLoadingMemos] = useState(false);

  // Fetch user's bookmarks on mount
  useEffect(() => {
    if (!user) {
      setBookmarkedIds(new Set());
      setBookmarkedMemos([]);
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

  // Fetch full bookmark data for the saved section
  const fetchBookmarkedMemos = useCallback(async () => {
    if (!user) return;
    
    setLoadingMemos(true);
    try {
      const { data: bookmarks, error: bookmarkError } = await supabase
        .from("bookmarks")
        .select("memo_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bookmarkError) throw bookmarkError;
      if (!bookmarks || bookmarks.length === 0) {
        setBookmarkedMemos([]);
        return;
      }

      const memoIds = bookmarks.map((b) => b.memo_id);
      const bookmarkDates = new Map(bookmarks.map((b) => [b.memo_id, new Date(b.created_at)]));

      const { data: memos, error: memosError } = await supabase
        .from("memos")
        .select("*")
        .in("id", memoIds);

      if (memosError) throw memosError;

      // Fetch profiles separately
      const userIds = [...new Set((memos || []).map(m => m.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const formattedMemos: BookmarkedMemo[] = (memos || []).map((m) => {
        const profile = profileMap.get(m.user_id || "");
        return {
          id: m.id,
          title: m.title,
          audioUrl: m.audio_url,
          transcript: m.transcript,
          summary: m.summary,
          categories: m.categories || [],
          duration: m.duration,
          createdAt: new Date(m.created_at),
          author: {
            id: m.user_id || "",
            name: profile?.display_name || m.author_name || "Anonymous",
            avatar: profile?.avatar_url || undefined,
          },
          likes: m.likes,
          viewCount: m.view_count,
          bookmarkedAt: bookmarkDates.get(m.id) || new Date(),
        };
      });

      // Sort by bookmark date
      formattedMemos.sort((a, b) => b.bookmarkedAt.getTime() - a.bookmarkedAt.getTime());
      setBookmarkedMemos(formattedMemos);
    } catch (error) {
      console.error("Error fetching bookmarked memos:", error);
    } finally {
      setLoadingMemos(false);
    }
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
          setBookmarkedMemos((prev) => prev.filter((m) => m.id !== memoId));
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
    bookmarkedMemos,
    fetchBookmarkedMemos,
    loadingMemos,
  };
}
