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

const Index = () => {
  const [activeTab, setActiveTab] = useState("record");
  
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
