import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SharedMemo {
  id: string;
  title: string;
  summary: string | null;
  transcript: string;
  audio_url: string | null;
  duration: number;
  created_at: string;
  categories: string[];
  likes: number;
  view_count: number;
  author_name: string;
  user_id: string | null;
  shared_at: string;
  shared_via: 'direct' | 'group';
  group_name?: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface UseSharedWithMeOptions {
  limit?: number;
}

export function useSharedWithMe(options: UseSharedWithMeOptions = {}) {
  const { limit = 20 } = options;
  const { user } = useAuth();
  
  const [memos, setMemos] = useState<SharedMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchSharedMemos = useCallback(async (refresh = false) => {
    if (!user) {
      setMemos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentOffset = refresh ? 0 : offset;

      // Get user's group memberships
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = (memberships || []).map(m => m.group_id);

      // Fetch shares directed at user or their groups
      let sharesQuery = supabase
        .from('memo_shares')
        .select(`
          id,
          memo_id,
          shared_with_user_id,
          shared_with_group_id,
          created_at,
          group:groups!memo_shares_shared_with_group_id_fkey(name)
        `)
        .neq('shared_by', user.id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1);

      // Add OR condition for user and groups
      if (groupIds.length > 0) {
        sharesQuery = sharesQuery.or(`shared_with_user_id.eq.${user.id},shared_with_group_id.in.(${groupIds.join(',')})`);
      } else {
        sharesQuery = sharesQuery.eq('shared_with_user_id', user.id);
      }

      const { data: shares, error: sharesError } = await sharesQuery;

      if (sharesError) throw sharesError;

      if (!shares || shares.length === 0) {
        if (refresh) setMemos([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Fetch the actual memos
      const memoIds = [...new Set(shares.map(s => s.memo_id))];
      
      const { data: memosData, error: memosError } = await supabase
        .from('memos')
        .select(`
          id,
          title,
          summary,
          transcript,
          audio_url,
          duration,
          created_at,
          categories,
          likes,
          view_count,
          author_name,
          user_id
        `)
        .in('id', memoIds);

      if (memosError) throw memosError;

      // Fetch author profiles
      const userIds = [...new Set((memosData || []).map(m => m.user_id).filter(Boolean))];
      
      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }

      // Build share info map
      const shareInfoMap = new Map(shares.map(s => [
        s.memo_id,
        {
          shared_at: s.created_at,
          shared_via: (s.shared_with_group_id ? 'group' : 'direct') as 'direct' | 'group',
          group_name: (s.group as any)?.name,
        },
      ]));

      // Combine data
      const sharedMemos: SharedMemo[] = (memosData || []).map(memo => ({
        ...memo,
        author: memo.user_id ? profileMap.get(memo.user_id) || null : null,
        ...shareInfoMap.get(memo.id)!,
      })).sort((a, b) => new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime());

      if (refresh) {
        setMemos(sharedMemos);
        setOffset(limit);
      } else {
        setMemos(prev => [...prev, ...sharedMemos]);
        setOffset(prev => prev + limit);
      }

      setHasMore(shares.length === limit);
      setError(null);
    } catch (err) {
      console.error('Error fetching shared memos:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user, limit, offset]);

  useEffect(() => {
    fetchSharedMemos(true);
  }, [user]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchSharedMemos(false);
    }
  }, [loading, hasMore, fetchSharedMemos]);

  const refresh = useCallback(() => {
    setOffset(0);
    fetchSharedMemos(true);
  }, [fetchSharedMemos]);

  return {
    memos,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
