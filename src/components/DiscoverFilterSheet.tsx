import { useState } from "react";
import { TrendingUp, Clock, Users, Search, X, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DiscoverFeed } from "@/hooks/useDiscoverMemos";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FEEDS: { id: DiscoverFeed; label: string; icon: React.ElementType; description: string }[] = [
  { id: "trending", label: "Trending", icon: TrendingUp, description: "Most popular memos" },
  { id: "recent", label: "Recent", icon: Clock, description: "Latest shared memos" },
  { id: "following", label: "Following", icon: Users, description: "From people you follow" },
];

const CATEGORIES = [
  "Ideas",
  "Work",
  "Learning",
  "Personal",
  "Creative",
  "Goals",
  "Reflections",
];

interface DiscoverFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFeed: DiscoverFeed;
  selectedCategories: string[];
  searchQuery: string;
  onApply: (feed: DiscoverFeed, categories: string[], search: string) => void;
}

export function DiscoverFilterSheet({
  open,
  onOpenChange,
  activeFeed,
  selectedCategories,
  searchQuery,
  onApply,
}: DiscoverFilterSheetProps) {
  const { user } = useAuth();
  const [localFeed, setLocalFeed] = useState<DiscoverFeed>(activeFeed);
  const [localCategories, setLocalCategories] = useState<string[]>(selectedCategories);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync state when sheet opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalFeed(activeFeed);
      setLocalCategories(selectedCategories);
      setLocalSearch(searchQuery);
    }
    onOpenChange(newOpen);
  };

  const handleFeedSelect = (feed: DiscoverFeed) => {
    if (feed === "following" && !user) {
      toast.error("Sign in to see memos from people you follow");
      return;
    }
    setLocalFeed(feed);
  };

  const toggleCategory = (category: string) => {
    setLocalCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleApply = () => {
    onApply(localFeed, localCategories, localSearch);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalFeed("trending");
    setLocalCategories([]);
    setLocalSearch("");
  };

  const hasActiveFilters = localCategories.length > 0 || localSearch.trim() !== "";

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-display text-xl">Filters</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 py-4 overflow-y-auto space-y-6">
          {/* Feed Selection */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Feed</h3>
            <div className="space-y-2">
              {FEEDS.map((feed) => {
                const Icon = feed.icon;
                const isActive = localFeed === feed.id;
                return (
                  <button
                    key={feed.id}
                    onClick={() => handleFeedSelect(feed.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isActive ? "bg-primary-foreground/20" : "bg-background"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{feed.label}</p>
                      <p className={cn(
                        "text-xs",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {feed.description}
                      </p>
                    </div>
                    {isActive && (
                      <Check className="h-5 w-5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const isSelected = localCategories.includes(category);
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Search</h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by title or content..."
                className="w-full pl-12 pr-10 py-3 rounded-2xl bg-muted/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <DrawerFooter className="pt-2">
          <div className="flex gap-3">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Reset
              </Button>
            )}
            <Button
              onClick={handleApply}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
