import { useState, useEffect } from "react";
import { Search, User, QrCode, Share2, Check, Loader2, UserPlus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddContactSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function AddContactSheet({ isOpen, onClose }: AddContactSheetProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingUser, setFollowingUser] = useState<string | null>(null);

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
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .neq("user_id", user?.id || "")
          .limit(15);

        // If searching with @, search by exact username
        if (searchQuery.startsWith("@")) {
          const username = searchQuery.slice(1).toLowerCase();
          if (username.length > 0) {
            query = query.eq("username", username);
          }
        } else {
          // Search by display_name or username
          query = query.or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Error searching users:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  const handleFollow = async (userId: string) => {
    if (!user) {
      toast.error("Sign in to follow users");
      return;
    }

    setFollowingUser(userId);
    const success = await toggleFollow(userId);
    setFollowingUser(null);

    if (success) {
      if (isFollowing(userId)) {
        toast.success("Contact removed");
      } else {
        toast.success("Contact added");
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Contact
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="search" className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="share" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Share Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="h-[calc(100%-60px)]">
            <div className="space-y-4 h-full flex flex-col">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by @username or name..."
                  className="pl-9"
                  autoFocus
                />
              </div>

              {/* Hint */}
              {!searchQuery && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Search by @username for exact matches, or search by name
                </p>
              )}

              {/* Results */}
              <ScrollArea className="flex-1">
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchQuery && searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((result) => {
                      const following = isFollowing(result.user_id);
                      const isLoading = followingUser === result.user_id;

                      return (
                        <div
                          key={result.user_id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl",
                            "bg-card border border-border/50"
                          )}
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={result.avatar_url || undefined} />
                            <AvatarFallback>
                              {(result.display_name || "U")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {result.display_name || "User"}
                            </p>
                            {result.username && (
                              <p className="text-sm text-muted-foreground">
                                @{result.username}
                              </p>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant={following ? "outline" : "default"}
                            onClick={() => handleFollow(result.user_id)}
                            disabled={isLoading || followLoading}
                            className="flex-shrink-0"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : following ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Added
                              </>
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="share" className="h-[calc(100%-60px)]">
            <div className="flex flex-col items-center justify-center h-full pb-8">
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Share your profile so others can add you as a contact
              </p>
              {user && (
                <QRCodeDisplay
                  username={(profile as { username?: string | null })?.username ?? null}
                  userId={user.id}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
