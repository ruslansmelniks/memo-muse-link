import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MemoVisibility = 'private' | 'shared' | 'followers' | 'void';

export interface MemoShare {
  id: string;
  memo_id: string;
  shared_with_user_id: string | null;
  shared_with_group_id: string | null;
  shared_by: string;
  created_at: string;
}

export interface ShareRecipient {
  type: 'user' | 'group';
  id: string;
  name: string;
  avatar_url?: string | null;
}

export function useMemoSharing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const shareMemo = async (
    memoId: string,
    recipients: ShareRecipient[]
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to share');
      return false;
    }

    try {
      setLoading(true);

      // Create share entries for each recipient
      const shareEntries = recipients.map(recipient => ({
        memo_id: memoId,
        shared_with_user_id: recipient.type === 'user' ? recipient.id : null,
        shared_with_group_id: recipient.type === 'group' ? recipient.id : null,
        shared_by: user.id,
      }));

      const { error } = await supabase
        .from('memo_shares')
        .insert(shareEntries);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error sharing memo:', err);
      toast.error('Failed to share memo');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unshareMemo = async (memoId: string, recipientId: string, recipientType: 'user' | 'group'): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      const query = supabase
        .from('memo_shares')
        .delete()
        .eq('memo_id', memoId)
        .eq('shared_by', user.id);

      if (recipientType === 'user') {
        query.eq('shared_with_user_id', recipientId);
      } else {
        query.eq('shared_with_group_id', recipientId);
      }

      const { error } = await query;

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error unsharing memo:', err);
      toast.error('Failed to unshare memo');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getMemoShares = useCallback(async (memoId: string): Promise<MemoShare[]> => {
    try {
      const { data, error } = await supabase
        .from('memo_shares')
        .select('*')
        .eq('memo_id', memoId);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error fetching memo shares:', err);
      return [];
    }
  }, []);

  const updateMemoVisibility = async (
    memoId: string,
    visibility: MemoVisibility,
    recipients?: ShareRecipient[]
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    try {
      setLoading(true);

      // Update the memo visibility
      const { error: memoError } = await supabase
        .from('memos')
        .update({ 
          visibility, 
          is_public: visibility === 'followers' || visibility === 'void' 
        })
        .eq('id', memoId)
        .eq('user_id', user.id);

      if (memoError) throw memoError;

      // If visibility is 'shared', handle recipients
      if (visibility === 'shared' && recipients && recipients.length > 0) {
        // First, remove existing shares
        await supabase
          .from('memo_shares')
          .delete()
          .eq('memo_id', memoId)
          .eq('shared_by', user.id);

        // Then add new shares
        await shareMemo(memoId, recipients);
      } else if (visibility !== 'shared') {
        // Remove all shares if not shared visibility
        await supabase
          .from('memo_shares')
          .delete()
          .eq('memo_id', memoId)
          .eq('shared_by', user.id);
      }

      return true;
    } catch (err) {
      console.error('Error updating memo visibility:', err);
      toast.error('Failed to update visibility');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    shareMemo,
    unshareMemo,
    getMemoShares,
    updateMemoVisibility,
  };
}
