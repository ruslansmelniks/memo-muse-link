import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FollowState {
  following: Set<string>;
  followerCounts: Map<string, number>;
  followingCounts: Map<string, number>;
}

export function useFollow() {
  const { user } = useAuth();
  const [state, setState] = useState<FollowState>({
    following: new Set(),
    followerCounts: new Map(),
    followingCounts: new Map(),
  });
  const [loading, setLoading] = useState(false);

  // Load who the current user is following
  useEffect(() => {
    if (!user) {
      setState({
        following: new Set(),
        followerCounts: new Map(),
        followingCounts: new Map(),
      });
      return;
    }

    async function loadFollowing() {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!error && data) {
        setState(prev => ({
          ...prev,
          following: new Set(data.map(f => f.following_id)),
        }));
      }
    }

    loadFollowing();
  }, [user]);

  const isFollowing = useCallback((userId: string) => {
    return state.following.has(userId);
  }, [state.following]);

  const followUser = useCallback(async (userId: string) => {
    if (!user || userId === user.id) return false;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: userId });

      if (error) throw error;

      setState(prev => {
        const newFollowing = new Set(prev.following);
        newFollowing.add(userId);
        
        const newFollowerCounts = new Map(prev.followerCounts);
        newFollowerCounts.set(userId, (prev.followerCounts.get(userId) || 0) + 1);
        
        return {
          ...prev,
          following: newFollowing,
          followerCounts: newFollowerCounts,
        };
      });
      return true;
    } catch (error) {
      console.error("Follow error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unfollowUser = useCallback(async (userId: string) => {
    if (!user) return false;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);

      if (error) throw error;

      setState(prev => {
        const newFollowing = new Set(prev.following);
        newFollowing.delete(userId);
        
        const newFollowerCounts = new Map(prev.followerCounts);
        const currentCount = prev.followerCounts.get(userId) || 0;
        if (currentCount > 0) {
          newFollowerCounts.set(userId, currentCount - 1);
        }
        
        return {
          ...prev,
          following: newFollowing,
          followerCounts: newFollowerCounts,
        };
      });
      return true;
    } catch (error) {
      console.error("Unfollow error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const toggleFollow = useCallback(async (userId: string) => {
    if (isFollowing(userId)) {
      return await unfollowUser(userId);
    } else {
      return await followUser(userId);
    }
  }, [isFollowing, followUser, unfollowUser]);

  const getFollowerCount = useCallback(async (userId: string): Promise<number> => {
    // Check cache first
    if (state.followerCounts.has(userId)) {
      return state.followerCounts.get(userId)!;
    }

    const { count, error } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    if (!error && count !== null) {
      setState(prev => {
        const newCounts = new Map(prev.followerCounts);
        newCounts.set(userId, count);
        return { ...prev, followerCounts: newCounts };
      });
      return count;
    }
    return 0;
  }, [state.followerCounts]);

  const getFollowingCount = useCallback(async (userId: string): Promise<number> => {
    if (state.followingCounts.has(userId)) {
      return state.followingCounts.get(userId)!;
    }

    const { count, error } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    if (!error && count !== null) {
      setState(prev => {
        const newCounts = new Map(prev.followingCounts);
        newCounts.set(userId, count);
        return { ...prev, followingCounts: newCounts };
      });
      return count;
    }
    return 0;
  }, [state.followingCounts]);

  return {
    isFollowing,
    followUser,
    unfollowUser,
    toggleFollow,
    getFollowerCount,
    getFollowingCount,
    loading,
  };
}
