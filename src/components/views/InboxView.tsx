import { useCallback, useRef, useEffect, useState } from "react";
import { Inbox, Users, User, RefreshCw, Mic } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DiscoverFeedCard } from "@/components/DiscoverFeedCard";
import { DiscoverCardSkeleton } from "@/components/DiscoverCardSkeleton";
import { PullToRefreshIndicator } from "@/components/PullToRefresh";
import { InboxRecordingSheet } from "@/components/InboxRecordingSheet";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useSharedWithMe, SharedMemo } from "@/hooks/useSharedWithMe";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { DiscoverMemo } from "@/hooks/useDiscoverMemos";
import { motion } from "framer-motion";

// Convert SharedMemo to DiscoverMemo format for the card
function toDiscoverMemo(shared: SharedMemo): DiscoverMemo {
  return {
    id: shared.id,
    title: shared.title,
    summary: shared.summary,
    transcript: shared.transcript,
    audioUrl: shared.audio_url,
    duration: shared.duration,
    createdAt: new Date(shared.created_at),
    categories: shared.categories || [],
    tasks: [],
    isPublic: false,
    language: null,
    likes: shared.likes,
    viewCount: shared.view_count,
    author: {
      id: shared.user_id || "",
      name: shared.author?.display_name || shared.author_name,
      avatar: shared.author?.avatar_url || undefined,
    },
  };
}

export function InboxView() {
  const { user } = useAuth();
  const { memos, loading, error, hasMore, loadMore, refresh } = useSharedWithMe({ limit: 20 });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Recording state
  const [showRecordingSheet, setShowRecordingSheet] = useState(false);
  const [replyingToMemo, setReplyingToMemo] = useState<SharedMemo | null>(null);

  const handleRefresh = useCallback(async () => {
    await refresh();
    toast.success("Inbox refreshed");
  }, [refresh]);

  const { containerRef, pullDistance, isRefreshing, progress, shouldRefresh } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // Infinite scroll
  useEffect(() => {
    if (loading) return;

    const callback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    };

    observerRef.current = new IntersectionObserver(callback, { threshold: 0.1 });
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loading, hasMore, loadMore]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6 pb-32">
        <div className="text-center py-12">
          <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">Your Inbox</h3>
          <p className="text-muted-foreground">Sign in to see memos shared with you</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="container mx-auto px-4 py-8 pb-36 relative overflow-auto"
      style={{ 
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        transition: pullDistance === 0 ? 'transform 0.2s ease-out' : undefined,
      }}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        progress={progress}
        shouldRefresh={shouldRefresh}
      />

      <PageHeader 
        title="Inbox" 
        subtitle="Memos shared with you"
      />

      {/* Content */}
      <div className="space-y-4">
        {loading && memos.length === 0 ? (
          // Initial loading state
          Array.from({ length: 3 }).map((_, i) => (
            <DiscoverCardSkeleton key={i} />
          ))
        ) : error ? (
          // Error state
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Inbox className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <button 
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : memos.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">No memos yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              When someone shares a memo with you directly or through a group, it will appear here.
            </p>
          </div>
        ) : (
          // Memo list
          <>
            {memos.map((sharedMemo, index) => (
              <div key={sharedMemo.id} className="animate-fade-in">
                {/* Share info header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    sharedMemo.shared_via === 'group' ? "bg-primary/10" : "bg-muted"
                  )}>
                    {sharedMemo.shared_via === 'group' ? (
                      <Users className="h-3 w-3 text-primary" />
                    ) : (
                      <User className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {sharedMemo.shared_via === 'group' ? (
                      <>Shared in <span className="font-medium text-foreground">{sharedMemo.group_name}</span></>
                    ) : (
                      <>Shared by <span className="font-medium text-foreground">{sharedMemo.author?.display_name || sharedMemo.author_name}</span></>
                    )}
                    {" · "}
                    {formatDistanceToNow(new Date(sharedMemo.shared_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Memo card */}
                <DiscoverFeedCard
                  memo={toDiscoverMemo(sharedMemo)}
                  index={index}
                  showReplyButton={true}
                  onReply={() => setReplyingToMemo(sharedMemo)}
                />
              </div>
            ))}

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="py-4">
              {loading && (
                <div className="flex justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating Record Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowRecordingSheet(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center z-40"
      >
        <Mic className="h-6 w-6 text-primary-foreground" />
      </motion.button>

      {/* Recording Sheet */}
      <InboxRecordingSheet
        isOpen={showRecordingSheet || !!replyingToMemo}
        onClose={() => {
          setShowRecordingSheet(false);
          setReplyingToMemo(null);
        }}
        replyTo={replyingToMemo ? {
          id: replyingToMemo.id,
          title: replyingToMemo.title,
          author_id: replyingToMemo.user_id,
          author_name: replyingToMemo.author?.display_name || replyingToMemo.author_name,
        } : undefined}
        onComplete={() => refresh()}
      />
    </div>
  );
}
