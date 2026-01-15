import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mic, Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Contact {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ContactsListProps {
  onSendMemo: (contact: Contact) => void;
}

export function ContactsList({ onSendMemo }: ContactsListProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadContacts() {
      setLoading(true);
      
      // Get users that the current user is following
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followsError || !follows || follows.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const followingIds = follows.map(f => f.following_id);

      // Get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", followingIds);

      if (profilesError) {
        console.error("Error loading contacts:", profilesError);
        setContacts([]);
      } else {
        setContacts(profiles || []);
      }
      
      setLoading(false);
    }

    loadContacts();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-display font-semibold text-lg mb-2">No contacts yet</h3>
        <p className="text-muted-foreground max-w-sm mx-auto text-sm">
          Follow people to add them to your contacts. You can search for users by their @username.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <div
          key={contact.user_id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl",
            "bg-card border border-border/50",
            "hover:bg-accent/50 transition-colors"
          )}
        >
          <Link to={`/profile/${contact.username ? `@${contact.username}` : contact.user_id}`} className="flex-shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={contact.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {(contact.display_name || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link 
              to={`/profile/${contact.username ? `@${contact.username}` : contact.user_id}`}
              className="block"
            >
              <p className="font-medium truncate hover:text-primary transition-colors">
                {contact.display_name || "User"}
              </p>
              {contact.username && (
                <p className="text-sm text-muted-foreground">
                  @{contact.username}
                </p>
              )}
            </Link>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={() => onSendMemo(contact)}
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
