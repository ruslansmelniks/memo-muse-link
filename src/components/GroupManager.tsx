import { useState } from 'react';
import { Plus, Users, MoreVertical, UserPlus, LogOut, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGroups, useGroupMembers, Group } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function GroupManager() {
  const { user } = useAuth();
  const { groups, loading, createGroup, updateGroup, deleteGroup, leaveGroup } = useGroups();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    setCreating(true);
    const result = await createGroup(newGroupName.trim(), newGroupDescription.trim() || undefined);
    setCreating(false);

    if (result) {
      setShowCreateDialog(false);
      setNewGroupName('');
      setNewGroupDescription('');
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (confirm(`Are you sure you want to delete "${group.name}"? This cannot be undone.`)) {
      await deleteGroup(group.id);
    }
  };

  const handleLeaveGroup = async (group: Group) => {
    if (confirm(`Are you sure you want to leave "${group.name}"?`)) {
      await leaveGroup(group.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Groups</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage shared spaces for memos
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Work Team, Study Group"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No groups yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create a group to share memos with specific people
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="text-left w-full"
                  >
                    <h3 className="font-medium truncate">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </p>
                  </button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedGroup(group)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage Members
                    </DropdownMenuItem>
                    {group.created_by === user?.id ? (
                      <DropdownMenuItem 
                        onClick={() => handleDeleteGroup(group)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Group
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleLeaveGroup(group)}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Leave Group
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Group Members Dialog */}
      <GroupMembersDialog
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </div>
  );
}

function GroupMembersDialog({ group, onClose }: { group: Group | null; onClose: () => void }) {
  const { user } = useAuth();
  const { members, loading, addMember, removeMember } = useGroupMembers(group?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [searching, setSearching] = useState(false);

  const isAdmin = group?.created_by === user?.id || members.find(m => m.user_id === user?.id)?.role === 'admin';

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const memberIds = members.map(m => m.user_id);
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .ilike('display_name', `%${query}%`)
        .not('user_id', 'in', `(${memberIds.join(',')})`)
        .limit(5);

      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    await addMember(userId);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!group) return null;

  return (
    <Dialog open={!!group} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{group.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isAdmin && (
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Add members by name..."
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-10">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.user_id}
                      onClick={() => handleAddMember(profile.user_id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {(profile.display_name || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{profile.display_name || 'User'}</span>
                      <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Loading members...</div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(member.profile?.display_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.profile?.display_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                    {isAdmin && member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember(member.user_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
