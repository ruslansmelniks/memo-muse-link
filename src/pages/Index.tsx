import { useState } from "react";
import { Header } from "@/components/Header";
import { TabNavigation } from "@/components/TabNavigation";
import { RecordView } from "@/components/views/RecordView";
import { DiscoverView } from "@/components/views/DiscoverView";
import { LibraryView } from "@/components/views/LibraryView";
import { SettingsView } from "@/components/views/SettingsView";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Index = () => {
  const [activeTab, setActiveTab] = useState("record");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");

  const renderView = () => {
    switch (activeTab) {
      case "record":
        return <RecordView />;
      case "discover":
        return <DiscoverView />;
      case "library":
        return <LibraryView searchQuery={librarySearchQuery} />;
      case "settings":
        return <SettingsView />;
      default:
        return <RecordView />;
    }
  };

  // Show search in header only for library tab
  const showSearch = activeTab === "library";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle decorative gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-hero opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-64 h-64 rounded-full gradient-secondary opacity-10 blur-3xl" />
      </div>

      <Header 
        showSearch={showSearch}
        searchQuery={librarySearchQuery}
        onSearchChange={setLibrarySearchQuery}
        searchPlaceholder="Search memos..."
      />
      
      <main className="relative flex-1 min-h-0 overflow-hidden">
        <div className="h-full">
          <ErrorBoundary>
            {renderView()}
          </ErrorBoundary>
        </div>
      </main>
      
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
