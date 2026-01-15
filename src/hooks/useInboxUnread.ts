import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const LAST_INBOX_VISIT_KEY = 'memo_inbox_last_visit';

export function useInboxUnread() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getLastVisit = useCallback((): string | null => {
    if (!user) return null;
    return localStorage.getItem(`${LAST_INBOX_VISIT_KEY}_${user.id}`);
  }, [user]);

  const markAsRead = useCallback(() => {
    if (!user) return;
    const now = new Date().toISOString();
    localStorage.setItem(`${LAST_INBOX_VISIT_KEY}_${user.id}`, now);
    setUnreadCount(0);
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const lastVisit = getLastVisit();

      // Get user's groups
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = memberships?.map(m => m.group_id) || [];

      // Build query for shares since last visit
      let query = supabase
        .from('memo_shares')
        .select('id', { count: 'exact', head: true })
        .neq('shared_by', user.id); // Don't count our own shares

      // Filter by recipient (user or group)
      if (groupIds.length > 0) {
        query = query.or(`shared_with_user_id.eq.${user.id},shared_with_group_id.in.(${groupIds.join(',')})`);
      } else {
        query = query.eq('shared_with_user_id', user.id);
      }

      // Only count shares after last visit
      if (lastVisit) {
        query = query.gt('created_at', lastVisit);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
      } else {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error('Error in fetchUnreadCount:', err);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, getLastVisit]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Subscribe to real-time updates for new shares
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('inbox-unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'memo_shares',
        },
        (payload) => {
          // Check if this share is for us (either directly or via group)
          const share = payload.new as { shared_with_user_id: string | null; shared_with_group_id: string | null; shared_by: string };
          
          // Don't count our own shares
          if (share.shared_by === user.id) return;
          
          // Increment count if shared with us directly
          if (share.shared_with_user_id === user.id) {
            setUnreadCount(prev => prev + 1);
          }
          // For group shares, we'd need to check membership - for now just refetch
          else if (share.shared_with_group_id) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCount]);

  return {
    unreadCount,
    loading,
    markAsRead,
    refresh: fetchUnreadCount,
  };
}
