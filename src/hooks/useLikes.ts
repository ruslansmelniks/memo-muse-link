import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LikeState {
  likedMemos: Set<string>;
  likeCounts: Map<string, number>;
}

export function useLikes() {
  const { user } = useAuth();
  const [state, setState] = useState<LikeState>({
    likedMemos: new Set(),
    likeCounts: new Map(),
  });
  const [loading, setLoading] = useState(false);

  // Load user's likes
  useEffect(() => {
    if (!user) {
      setState({
        likedMemos: new Set(),
        likeCounts: new Map(),
      });
      return;
    }

    async function loadLikes() {
      const { data, error } = await supabase
        .from("memo_likes")
        .select("memo_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setState(prev => ({
          ...prev,
          likedMemos: new Set(data.map(l => l.memo_id)),
        }));
      }
    }

    loadLikes();
  }, [user]);

  const isLiked = useCallback((memoId: string) => {
    return state.likedMemos.has(memoId);
  }, [state.likedMemos]);

  const getLikeCount = useCallback((memoId: string) => {
    return state.likeCounts.get(memoId);
  }, [state.likeCounts]);

  const setInitialLikeCount = useCallback((memoId: string, count: number) => {
    setState(prev => {
      const newCounts = new Map(prev.likeCounts);
      newCounts.set(memoId, count);
      return { ...prev, likeCounts: newCounts };
    });
  }, []);

  const toggleLike = useCallback(async (memoId: string, currentCount: number) => {
    if (!user) return { success: false, newCount: currentCount, isLiked: false };
    
    const wasLiked = state.likedMemos.has(memoId);
    const optimisticCount = wasLiked ? currentCount - 1 : currentCount + 1;
    
    // Optimistic update
    setState(prev => {
      const newLikedMemos = new Set(prev.likedMemos);
      if (wasLiked) {
        newLikedMemos.delete(memoId);
      } else {
        newLikedMemos.add(memoId);
      }
      
      const newCounts = new Map(prev.likeCounts);
      newCounts.set(memoId, optimisticCount);
      
      return {
        likedMemos: newLikedMemos,
        likeCounts: newCounts,
      };
    });
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("toggle_memo_like", {
        p_memo_id: memoId,
        p_user_id: user.id,
      });

      if (error) throw error;

      const isNowLiked = data as boolean;
      return { 
        success: true, 
        newCount: optimisticCount, 
        isLiked: isNowLiked 
      };
    } catch (error) {
      console.error("Toggle like error:", error);
      
      // Rollback optimistic update
      setState(prev => {
        const newLikedMemos = new Set(prev.likedMemos);
        if (wasLiked) {
          newLikedMemos.add(memoId);
        } else {
          newLikedMemos.delete(memoId);
        }
        
        const newCounts = new Map(prev.likeCounts);
        newCounts.set(memoId, currentCount);
        
        return {
          likedMemos: newLikedMemos,
          likeCounts: newCounts,
        };
      });
      
      return { success: false, newCount: currentCount, isLiked: wasLiked };
    } finally {
      setLoading(false);
    }
  }, [user, state.likedMemos]);

  return {
    isLiked,
    getLikeCount,
    setInitialLikeCount,
    toggleLike,
    loading,
  };
}
