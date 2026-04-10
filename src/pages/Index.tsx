import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { TabNavigation } from "@/components/TabNavigation";
import { RecordView } from "@/components/views/RecordView";
import { DiscoverView } from "@/components/views/DiscoverView";
import { InboxView } from "@/components/views/InboxView";
import { LibraryView } from "@/components/views/LibraryView";
import { SettingsView } from "@/components/views/SettingsView";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useInboxUnread } from "@/hooks/useInboxUnread";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [activeTab, setActiveTab] = useState("record");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading } = useAuth();
  
  // Only use inbox unread tracking when social features are enabled
  const { unreadCount, markAsRead } = useInboxUnread();

  // Mark inbox as read when user navigates to inbox tab (only when social features enabled)
  useEffect(() => {
    if (!FEATURE_FLAGS.CORE_FEATURES_ONLY && activeTab === "inbox") {
      markAsRead();
    }
  }, [activeTab, markAsRead]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleNativeTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: string }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };

    window.addEventListener("nativeTabChange", handleNativeTabChange as EventListener);
    return () => window.removeEventListener("nativeTabChange", handleNativeTabChange as EventListener);
  }, []);

  const isNativeIos =
    typeof window !== "undefined" &&
    (window as typeof window & { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.() === "ios";

  const renderView = () => {
    switch (activeTab) {
      case "record":
        return <RecordView />;
      case "discover":
        // In core features mode, redirect to record
        return FEATURE_FLAGS.CORE_FEATURES_ONLY ? <RecordView /> : <DiscoverView />;
      case "inbox":
        // In core features mode, redirect to record
        return FEATURE_FLAGS.CORE_FEATURES_ONLY ? <RecordView /> : <InboxView />;
      case "library":
        return <LibraryView />;
      case "settings":
        return <SettingsView />;
      default:
        return <RecordView />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // Hard auth gate: new users must sign in / sign up before accessing the app.
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md text-center">
            <h1 className="font-display font-bold text-3xl text-foreground mb-3">ThoughtSpark</h1>
            <p className="text-muted-foreground mb-8">
              Sign in to save memos, sync across devices, and access AI summaries.
            </p>

            <div className="flex flex-col gap-3">
              <Button variant="hero" size="lg" className="w-full" onClick={() => setShowAuthModal(true)}>
                Sign In / Sign Up
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setShowAuthModal(true)}
              >
                Create account
              </Button>
            </div>
          </div>
        </div>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle decorative gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-hero opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-64 h-64 rounded-full gradient-secondary opacity-10 blur-3xl" />
      </div>

      <Header />
      
      <main className="relative flex-1 min-h-0 overflow-hidden">
        <div className="h-full">
          <ErrorBoundary>
            {renderView()}
          </ErrorBoundary>
        </div>
      </main>
      
      {!isNativeIos && (
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          inboxUnreadCount={FEATURE_FLAGS.CORE_FEATURES_ONLY ? 0 : unreadCount}
        />
      )}
    </div>
  );
};

export default Index;
