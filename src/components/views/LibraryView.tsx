import { useState } from "react";
import { FolderOpen, Clock, Heart, CheckCircle2 } from "lucide-react";
import { MemoCard } from "@/components/MemoCard";
import { mockMemos } from "@/data/mockData";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "all", label: "All", icon: FolderOpen },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "tasks", label: "With Tasks", icon: CheckCircle2 },
];

export function LibraryView() {
  const [activeTab, setActiveTab] = useState("all");

  const getFilteredMemos = () => {
    switch (activeTab) {
      case "recent":
        return [...mockMemos].sort((a, b) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        ).slice(0, 5);
      case "favorites":
        return mockMemos.filter(m => m.likes > 10);
      case "tasks":
        return mockMemos.filter(m => m.tasks.length > 0);
      default:
        return mockMemos;
    }
  };

  const filteredMemos = getFilteredMemos();

  return (
    <div className="container mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">
          Your Library
        </h2>
        <p className="text-muted-foreground">
          {mockMemos.length} memos · {mockMemos.filter(m => m.tasks.length > 0).reduce((acc, m) => acc + m.tasks.length, 0)} tasks extracted
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                isActive
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: "150ms" }}>
          <div className="w-10 h-10 rounded-xl gradient-mint flex items-center justify-center mb-2">
            <Clock className="h-5 w-5 text-mint-400" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">
            {Math.round(mockMemos.reduce((acc, m) => acc + m.duration, 0) / 60)}m
          </p>
          <p className="text-xs text-muted-foreground">Total recorded</p>
        </div>
        
        <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="w-10 h-10 rounded-xl gradient-lavender flex items-center justify-center mb-2">
            <CheckCircle2 className="h-5 w-5 text-lavender-400" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">
            {mockMemos.reduce((acc, m) => acc + m.tasks.length, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Tasks extracted</p>
        </div>
      </div>

      {/* Memos List */}
      <div className="space-y-4">
        {filteredMemos.map((memo, i) => (
          <div 
            key={memo.id}
            style={{ animationDelay: `${250 + i * 100}ms` }}
            className="animate-slide-up"
          >
            <MemoCard memo={memo} />
          </div>
        ))}
      </div>
    </div>
  );
}
