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
      {/* Decorative gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full gradient-hero opacity-30 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full gradient-secondary opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 rounded-full gradient-mint opacity-25 blur-3xl" />
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
