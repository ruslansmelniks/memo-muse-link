import { useState, useEffect } from 'react';
import { Search, Users, User, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { ShareRecipient } from '@/hooks/useMemoSharing';
import { cn } from '@/lib/utils';

interface ShareRecipientPickerProps {
  selectedRecipients: ShareRecipient[];
  onChange: (recipients: ShareRecipient[]) => void;
}

interface SearchedUser {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function ShareRecipientPicker({ selectedRecipients, onChange }: ShareRecipientPickerProps) {
  const { user } = useAuth();
  const { groups, loading: groupsLoading } = useGroups();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        let query = supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .neq('user_id', user?.id || '')
          .limit(10);

        // If searching with @, search by exact username
        if (searchQuery.startsWith('@')) {
          const username = searchQuery.slice(1).toLowerCase();
          if (username.length > 0) {
            query = query.eq('username', username);
          }
        } else {
          // Search by display_name or username
          query = query.or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  const isSelected = (type: 'user' | 'group', id: string) => {
    return selectedRecipients.some(r => r.type === type && r.id === id);
  };

  const toggleRecipient = (recipient: ShareRecipient) => {
    const exists = isSelected(recipient.type, recipient.id);
    if (exists) {
      onChange(selectedRecipients.filter(r => !(r.type === recipient.type && r.id === recipient.id)));
    } else {
      onChange([...selectedRecipients, recipient]);
    }
  };

  const removeRecipient = (recipient: ShareRecipient) => {
    onChange(selectedRecipients.filter(r => !(r.type === recipient.type && r.id === recipient.id)));
  };

  return (
    <div className="space-y-4">
      {/* Selected recipients */}
      {selectedRecipients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedRecipients.map((recipient) => (
            <Badge
              key={`${recipient.type}-${recipient.id}`}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {recipient.type === 'group' ? (
                <Users className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              <span className="max-w-[100px] truncate">{recipient.name}</span>
              <button
                onClick={() => removeRecipient(recipient)}
                className="ml-1 rounded-full p-0.5 hover:bg-background/50"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by @username or name..."
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[200px]">
        {/* Groups section */}
        {groups.length > 0 && !searchQuery && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Your Groups
            </h4>
            <div className="space-y-1">
              {groups.map((group) => {
                const selected = isSelected('group', group.id);
                return (
                  <button
                    key={group.id}
                    onClick={() => toggleRecipient({
                      type: 'group',
                      id: group.id,
                      name: group.name,
                      avatar_url: group.avatar_url,
                    })}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                      'hover:bg-accent text-left',
                      selected && 'bg-primary/10'
                    )}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.member_count} members
                      </p>
                    </div>
                    {selected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search results */}
        {searchQuery && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              People
            </h4>
            {searching ? (
              <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((profile) => {
                  const selected = isSelected('user', profile.user_id);
                  return (
                    <button
                      key={profile.user_id}
                      onClick={() => toggleRecipient({
                        type: 'user',
                        id: profile.user_id,
                        name: profile.display_name || 'User',
                        avatar_url: profile.avatar_url,
                      })}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                        'hover:bg-accent text-left',
                        selected && 'bg-primary/10'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {(profile.display_name || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {profile.display_name || 'User'}
                        </p>
                        {profile.username && (
                          <p className="text-xs text-muted-foreground">
                            @{profile.username}
                          </p>
                        )}
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!searchQuery && groups.length === 0 && !groupsLoading && (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No groups yet. Search for people to share with.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
