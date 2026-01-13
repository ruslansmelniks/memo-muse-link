import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Compass, SlidersHorizontal, Loader2, Sparkles, TrendingUp, Clock, Users } from "lucide-react";
import { useDiscoverMemos, DiscoverFeed } from "@/hooks/useDiscoverMemos";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useHaptics } from "@/hooks/useHaptics";
import { PullToRefreshIndicator } from "@/components/PullToRefresh";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { DiscoverFeedCard } from "@/components/DiscoverFeedCard";
import { DiscoverFilterSheet } from "@/components/DiscoverFilterSheet";
import { DEMO_MEMOS } from "@/data/demoMemos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

const FEED_TABS: { id: DiscoverFeed; label: string; icon: React.ElementType }[] = [
  { id: "for-you", label: "For You", icon: Sparkles },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "following", label: "Following", icon: Users },
];

export function DiscoverView() {
  const { user } = useAuth();
  const [activeFeed, setActiveFeed] = useState<DiscoverFeed>("for-you");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const haptics = useHaptics();

  const { memos: dbMemos, loading, loadingMore, hasMore, loadMore, refresh } = useDiscoverMemos({
    feed: activeFeed,
    categories: selectedCategories,
    searchQuery: debouncedSearch,
  });

  // Combine demo memos with database memos
  const memos = useMemo(() => {
    if (dbMemos.length > 0) return dbMemos;
    return DEMO_MEMOS;
  }, [dbMemos]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await refresh();
    haptics.notification("success");
    toast.success("Feed refreshed");
  }, [refresh, haptics]);

  const {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    shouldRefresh,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPull: 120,
  });

  // Infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when 200px from bottom
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !loading && !loadingMore) {
        loadMore();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, loadingMore, loadMore]);

  const handleFeedChange = useCallback((feed: DiscoverFeed) => {
    if (feed === "following" && !user) {
      toast.error("Sign in to see memos from people you follow");
      return;
    }
    haptics.selection();
    setActiveFeed(feed);
  }, [user, haptics]);

  const handleApplyFilters = useCallback((feed: DiscoverFeed, categories: string[], search: string) => {
    haptics.impact("light");
    setActiveFeed(feed);
    setSelectedCategories(categories);
    setSearchQuery(search);
  }, [haptics]);

  const activeFilterCount = selectedCategories.length + (searchQuery ? 1 : 0);

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-hidden bg-background"
      style={{
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        transition: pullDistance === 0 ? "transform 0.2s ease-out" : undefined,
      }}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        progress={progress}
        shouldRefresh={shouldRefresh}
      />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Compass className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Discover
              </h2>
            </div>

            {/* Filter Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                haptics.selection();
                setFilterSheetOpen(true);
              }}
              className={cn(
                "h-10 w-10 rounded-xl relative",
                activeFilterCount > 0 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Feed Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {FEED_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFeed === tab.id;
              const isDisabled = tab.id === "following" && !user;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleFeedChange(tab.id)}
                  disabled={isDisabled}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Feed */}
      <div 
        ref={scrollContainerRef}
        className="h-[calc(100%-140px)] overflow-y-auto"
      >
        <div className="px-4 py-4 space-y-1">
          {/* Loading State */}
          {loading && memos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading memos...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && memos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Compass className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">No memos found</h3>
              <p className="text-muted-foreground mb-6">
                {activeFeed === "for-you" && !user
                  ? "Sign in to get personalized recommendations based on your interests."
                  : activeFeed === "following"
                  ? "Follow some creators to see their memos here."
                  : "Try adjusting your filters or check back later."}
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setFilterSheetOpen(true)} variant="outline">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <Button onClick={() => refresh()} variant="outline">
                  Refresh
                </Button>
              </div>
            </div>
          )}

          {/* Memo Cards */}
          {memos.map((memo, index) => (
            <div key={memo.id}>
              <DiscoverFeedCard memo={memo} className="py-4" />
              {index < memos.length - 1 && <Separator />}
            </div>
          ))}

          {/* Load More Indicator */}
          {loadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* End of Feed */}
          {!hasMore && memos.length > 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              You've reached the end
            </div>
          )}
        </div>
      </div>

      {/* Filter Sheet */}
      <DiscoverFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        activeFeed={activeFeed}
        selectedCategories={selectedCategories}
        searchQuery={searchQuery}
        onApply={handleApplyFilters}
      />
    </div>
  );
}
