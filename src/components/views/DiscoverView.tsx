import { useState, useCallback, useEffect } from "react";
import { Compass, SlidersHorizontal, Shuffle, Loader2, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDiscoverMemos, DiscoverFeed, fetchRandomMemo, DiscoverMemo } from "@/hooks/useDiscoverMemos";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefresh";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { StoryMemoCard } from "@/components/StoryMemoCard";
import { DiscoverFilterSheet } from "@/components/DiscoverFilterSheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DiscoverView() {
  const [activeFeed, setActiveFeed] = useState<DiscoverFeed>("trending");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingRandom, setLoadingRandom] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { memos, loading, hasMore, loadMore, refresh } = useDiscoverMemos({
    feed: activeFeed,
    categories: selectedCategories,
    searchQuery: debouncedSearch,
  });

  // Load more when approaching end
  useEffect(() => {
    if (currentIndex >= memos.length - 2 && hasMore && !loading) {
      loadMore();
    }
  }, [currentIndex, memos.length, hasMore, loading, loadMore]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setCurrentIndex(0);
    await refresh();
    toast.success("Feed refreshed");
  }, [refresh]);

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

  const handleApplyFilters = useCallback((feed: DiscoverFeed, categories: string[], search: string) => {
    setActiveFeed(feed);
    setSelectedCategories(categories);
    setSearchQuery(search);
    setCurrentIndex(0);
  }, []);

  const handleSwipeUp = useCallback(() => {
    if (currentIndex < memos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, memos.length]);

  const handleSwipeDown = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleRandomPlay = useCallback(async () => {
    setLoadingRandom(true);
    try {
      const randomMemo = await fetchRandomMemo();
      if (randomMemo) {
        // Find if this memo exists in current list
        const existingIndex = memos.findIndex(m => m.id === randomMemo.id);
        if (existingIndex !== -1) {
          setCurrentIndex(existingIndex);
        } else {
          // Add to beginning and go there
          // For now, just refresh with the random memo shown
          toast.success(`Playing: ${randomMemo.title}`);
          // Navigate to the memo page for full experience
          window.location.href = `/memo/${randomMemo.id}`;
        }
      } else {
        toast.error("No memos found");
      }
    } catch {
      toast.error("Failed to load random memo");
    } finally {
      setLoadingRandom(false);
    }
  }, [memos]);

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

      {/* Minimal Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-4 bg-gradient-to-b from-background via-background/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Discover
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Random Play Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRandomPlay}
              disabled={loadingRandom}
              className="h-10 w-10 rounded-xl bg-muted/50 hover:bg-muted"
            >
              {loadingRandom ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Shuffle className="h-5 w-5" />
              )}
            </Button>

            {/* Filter Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilterSheetOpen(true)}
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
        </div>
      </div>

      {/* Story Cards Container */}
      <div className="relative h-full">
        {/* Loading State */}
        {loading && memos.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading memos...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && memos.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Compass className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-xl mb-2">No memos found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? "Try adjusting your search or filters" 
                : activeFeed === "following" 
                  ? "Follow some creators to see their memos here"
                  : "Be the first to share a public memo!"
              }
            </p>
            <Button onClick={() => setFilterSheetOpen(true)} variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Adjust Filters
            </Button>
          </div>
        )}

        {/* Story Cards */}
        <AnimatePresence mode="wait">
          {memos.length > 0 && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <StoryMemoCard
                memo={memos[currentIndex]}
                isActive={true}
                onSwipeUp={handleSwipeUp}
                onSwipeDown={handleSwipeDown}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Position Indicators */}
        {memos.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {memos.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((memo, i) => {
              const actualIndex = Math.max(0, currentIndex - 2) + i;
              const isActive = actualIndex === currentIndex;
              return (
                <motion.div
                  key={memo.id}
                  initial={{ scale: 0.8 }}
                  animate={{ 
                    scale: isActive ? 1 : 0.8,
                    opacity: isActive ? 1 : 0.4
                  }}
                  className={cn(
                    "rounded-full transition-all",
                    isActive ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground"
                  )}
                />
              );
            })}
          </div>
        )}

        {/* Navigation Hint */}
        {currentIndex > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center text-muted-foreground z-10"
          >
            <ChevronUp className="h-5 w-5 animate-bounce" />
            <span className="text-xs">Previous</span>
          </motion.div>
        )}
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
