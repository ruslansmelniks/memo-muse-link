import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Mic, FileText, User, FolderOpen, Clock } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "memo" | "folder" | "profile";
  title: string;
  subtitle?: string;
  icon: React.ElementType;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, results, selectedIndex, onClose]);

  // Search memos
  useEffect(() => {
    const search = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Search memos (both user's and public)
        const { data: memos } = await supabase
          .from("memos")
          .select("id, title, summary, author_name")
          .or(`title.ilike.%${debouncedQuery}%,transcript.ilike.%${debouncedQuery}%,summary.ilike.%${debouncedQuery}%`)
          .or(user ? `user_id.eq.${user.id},is_public.eq.true` : "is_public.eq.true")
          .limit(6);

        if (memos) {
          memos.forEach(memo => {
            searchResults.push({
              id: memo.id,
              type: "memo",
              title: memo.title,
              subtitle: memo.summary?.slice(0, 60) || memo.author_name,
              icon: Mic,
            });
          });
        }

        // Search folders if logged in
        if (user) {
          const { data: folders } = await supabase
            .from("folders")
            .select("id, name, description")
            .eq("user_id", user.id)
            .ilike("name", `%${debouncedQuery}%`)
            .limit(3);

          if (folders) {
            folders.forEach(folder => {
              searchResults.push({
                id: folder.id,
                type: "folder",
                title: folder.name,
                subtitle: folder.description || "Folder",
                icon: FolderOpen,
              });
            });
          }
        }

        // Search profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, bio")
          .not("display_name", "is", null)
          .ilike("display_name", `%${debouncedQuery}%`)
          .limit(3);

        if (profiles) {
          profiles.forEach(profile => {
            if (profile.display_name) {
              searchResults.push({
                id: profile.user_id,
                type: "profile",
                title: profile.display_name,
                subtitle: profile.bio?.slice(0, 50) || "User",
                icon: User,
              });
            }
          });
        }

        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery, user]);

  const handleSelect = (result: SearchResult) => {
    switch (result.type) {
      case "memo":
        navigate(`/memo/${result.id}`);
        break;
      case "profile":
        navigate(`/profile/${result.id}`);
        break;
      case "folder":
        // TODO: Navigate to folder view
        break;
    }
    onClose();
  };

  const recentSearches = [
    { label: "Recent memos", icon: Clock },
    { label: "Your folders", icon: FolderOpen },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Search Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 top-4 sm:top-[15%] sm:left-1/2 sm:-translate-x-1/2 sm:inset-x-auto w-full sm:max-w-xl z-50 px-3 sm:px-4"
          >
            <div className="bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
                <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search memos, folders, people..."
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-lg"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 text-xs text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                {loading && (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="py-2">
                    {results.map((result, index) => {
                      const Icon = result.icon;
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                            selectedIndex === index
                              ? "bg-muted"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            result.type === "memo" && "bg-primary/10 text-primary",
                            result.type === "folder" && "bg-amber-500/10 text-amber-500",
                            result.type === "profile" && "bg-blue-500/10 text-blue-500"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-sm text-muted-foreground truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">
                            {result.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!loading && query && results.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No results for "{query}"
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Try a different search term
                    </p>
                  </div>
                )}

                {!loading && !query && (
                  <div className="py-2">
                    <p className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide">
                      Quick Actions
                    </p>
                    {recentSearches.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={i}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <span className="text-foreground">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer - hidden on mobile for more space */}
              <div className="hidden sm:flex px-4 py-3 border-t border-border bg-muted/30 items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="h-5 px-1.5 rounded border border-border bg-background">↑</kbd>
                    <kbd className="h-5 px-1.5 rounded border border-border bg-background">↓</kbd>
                    <span>Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="h-5 px-1.5 rounded border border-border bg-background">↵</kbd>
                    <span>Open</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
