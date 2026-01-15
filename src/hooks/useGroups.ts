import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch groups user is a member of
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      if (!membershipData || membershipData.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const groupIds = membershipData.map(m => m.group_id);
      
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          return { ...group, member_count: count || 0 };
        })
      );

      setGroups(groupsWithCounts);
      setError(null);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string, description?: string) => {
    if (!user) {
      toast.error('You must be logged in to create a group');
      return null;
    }

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name, description, created_by: user.id })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'admin' });

      if (memberError) throw memberError;

      toast.success('Group created!');
      await fetchGroups();
      return group;
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('Failed to create group');
      return null;
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<Pick<Group, 'name' | 'description' | 'avatar_url'>>) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Group updated');
      await fetchGroups();
      return true;
    } catch (err) {
      console.error('Error updating group:', err);
      toast.error('Failed to update group');
      return false;
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Group deleted');
      await fetchGroups();
      return true;
    } catch (err) {
      console.error('Error deleting group:', err);
      toast.error('Failed to delete group');
      return false;
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Left group');
      await fetchGroups();
      return true;
    } catch (err) {
      console.error('Error leaving group:', err);
      toast.error('Failed to leave group');
      return false;
    }
  };

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    refetch: fetchGroups,
  };
}

export function useGroupMembers(groupId: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!groupId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch members first
      const { data: membersOnly, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Fetch profiles separately
      const memberIds = (membersOnly || []).map(m => m.user_id);
      
      let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      
      if (memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', memberIds);

        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }
      
      setMembers((membersOnly || []).map(m => ({
        ...m,
        role: m.role as 'admin' | 'member',
        profile: profileMap.get(m.user_id) || undefined,
      })));
    } catch (err) {
      console.error('Error fetching group members:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (userId: string) => {
    if (!groupId) return false;

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId, role: 'member' });

      if (error) throw error;

      toast.success('Member added');
      await fetchMembers();
      return true;
    } catch (err) {
      console.error('Error adding member:', err);
      toast.error('Failed to add member');
      return false;
    }
  };

  const removeMember = async (userId: string) => {
    if (!groupId) return false;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Member removed');
      await fetchMembers();
      return true;
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Failed to remove member');
      return false;
    }
  };

  return {
    members,
    loading,
    addMember,
    removeMember,
    refetch: fetchMembers,
  };
}
