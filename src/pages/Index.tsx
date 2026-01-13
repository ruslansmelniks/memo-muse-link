import { useState } from "react";
import { Header } from "@/components/Header";
import { TabNavigation } from "@/components/TabNavigation";
import { RecordView } from "@/components/views/RecordView";
import { DiscoverView } from "@/components/views/DiscoverView";
import { LibraryView } from "@/components/views/LibraryView";
import { SettingsView } from "@/components/views/SettingsView";

const Index = () => {
  const [activeTab, setActiveTab] = useState("record");

  const renderView = () => {
    switch (activeTab) {
      case "record":
        return <RecordView />;
      case "discover":
        return <DiscoverView />;
      case "library":
        return <LibraryView />;
      case "settings":
        return <SettingsView />;
      default:
        return <RecordView />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle decorative gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-hero opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-64 h-64 rounded-full gradient-secondary opacity-10 blur-3xl" />
      </div>

      <Header />
      
      <main className="relative">
        {renderView()}
      </main>
      
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
