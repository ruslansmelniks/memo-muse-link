import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VoidMemo {
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
  author?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface UseVoidFeedOptions {
  limit?: number;
}

export function useVoidFeed(options: UseVoidFeedOptions = {}) {
  const { limit = 20 } = options;
  
  const [memos, setMemos] = useState<VoidMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const fetchVoidMemos = useCallback(async (refresh = false) => {
    try {
      setLoading(true);

      // Fetch random void memos
      // Using a subquery with random() for truly random results
      const { data, error: fetchError } = await supabase
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
        .eq('visibility', 'void')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Fetch extra for randomization

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setMemos([]);
        setLoading(false);
        return;
      }

      // Shuffle the results client-side for true randomness
      const shuffled = [...data].sort(() => Math.random() - 0.5);

      // Filter out already seen memos if not refreshing
      let filteredMemos = refresh 
        ? shuffled 
        : shuffled.filter(m => !seenIds.has(m.id));

      // If we've seen all memos, reset
      if (filteredMemos.length === 0) {
        filteredMemos = shuffled;
        setSeenIds(new Set());
      }

      // Take the limit
      const selectedMemos = filteredMemos.slice(0, limit);

      // Fetch author profiles
      const userIds = [...new Set(selectedMemos.map(m => m.user_id).filter(Boolean))];
      
      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }

      // Combine memos with author info
      const memosWithAuthors: VoidMemo[] = selectedMemos.map(memo => ({
        ...memo,
        author: memo.user_id ? profileMap.get(memo.user_id) || null : null,
      }));

      // Track seen IDs
      setSeenIds(prev => {
        const newSet = new Set(prev);
        selectedMemos.forEach(m => newSet.add(m.id));
        return newSet;
      });

      if (refresh) {
        setMemos(memosWithAuthors);
      } else {
        setMemos(prev => [...prev, ...memosWithAuthors]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching void memos:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [limit, seenIds]);

  useEffect(() => {
    fetchVoidMemos(true);
  }, []);

  const loadMore = useCallback(() => {
    if (!loading) {
      fetchVoidMemos(false);
    }
  }, [loading, fetchVoidMemos]);

  const refresh = useCallback(() => {
    setSeenIds(new Set());
    fetchVoidMemos(true);
  }, [fetchVoidMemos]);

  return {
    memos,
    loading,
    error,
    loadMore,
    refresh,
  };
}
