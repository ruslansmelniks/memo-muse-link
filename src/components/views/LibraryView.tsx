import { useState, useEffect } from "react";
import { FolderOpen, Clock, Heart, CheckCircle2, Trash2 } from "lucide-react";
import { MemoCard } from "@/components/MemoCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Memo {
  id: string;
  title: string;
  audioUrl?: string | null;
  transcript: string;
  summary: string | null;
  categories: string[];
  tasks: string[];
  isPublic: boolean;
  createdAt: Date;
  duration: number;
  author: { name: string };
  likes: number;
  comments: number;
}

const tabs = [
  { id: "all", label: "All", icon: FolderOpen },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "public", label: "Public", icon: Heart },
  { id: "tasks", label: "With Tasks", icon: CheckCircle2 },
];

export function LibraryView() {
  const [activeTab, setActiveTab] = useState("all");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadMemos();
    } else {
      setMemos([]);
      setLoading(false);
    }
  }, [user]);

  const loadMemos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading memos:", error);
    } else if (data) {
      setMemos(data.map(m => ({
        id: m.id,
        title: m.title,
        audioUrl: m.audio_url,
        transcript: m.transcript,
        summary: m.summary,
        categories: m.categories || [],
        tasks: m.tasks || [],
        isPublic: m.is_public,
        createdAt: new Date(m.created_at),
        duration: m.duration,
        author: { name: "You" },
        likes: m.likes,
        comments: 0,
      })));
    }
    setLoading(false);
  };

  const handleDeleteMemo = async (id: string) => {
    try {
      const memo = memos.find(m => m.id === id);
      
      const { error } = await supabase
        .from("memos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (memo?.audioUrl) {
        const path = memo.audioUrl.split("/audio-memos/")[1];
        if (path) {
          await supabase.storage.from("audio-memos").remove([path]);
        }
      }

      setMemos(memos.filter(m => m.id !== id));
      toast.success("Memo deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete memo");
    }
  };

  const handleUpdateTitle = async (id: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("memos")
        .update({ title: newTitle })
        .eq("id", id);

      if (error) throw error;

      setMemos(memos.map(m => m.id === id ? { ...m, title: newTitle } : m));
      toast.success("Title updated");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update title");
    }
  };

  const getFilteredMemos = () => {
    switch (activeTab) {
      case "recent":
        return [...memos].slice(0, 5);
      case "public":
        return memos.filter(m => m.isPublic);
      case "tasks":
        return memos.filter(m => m.tasks.length > 0);
      default:
        return memos;
    }
  };

  const filteredMemos = getFilteredMemos();
  const totalDuration = memos.reduce((acc, m) => acc + m.duration, 0);
  const totalTasks = memos.reduce((acc, m) => acc + m.tasks.length, 0);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6 pb-32">
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">Your Library</h3>
          <p className="text-muted-foreground">Sign in to view your saved memos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">
          Your Library
        </h2>
        <p className="text-muted-foreground">
          {memos.length} memos · {totalTasks} tasks extracted
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
            {Math.round(totalDuration / 60)}m
          </p>
          <p className="text-xs text-muted-foreground">Total recorded</p>
        </div>
        
        <div className="glass-card rounded-2xl p-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="w-10 h-10 rounded-xl gradient-lavender flex items-center justify-center mb-2">
            <CheckCircle2 className="h-5 w-5 text-lavender-400" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">
            {totalTasks}
          </p>
          <p className="text-xs text-muted-foreground">Tasks extracted</p>
        </div>
      </div>

      {/* Memos List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : filteredMemos.length > 0 ? (
          filteredMemos.map((memo, i) => (
            <div 
              key={memo.id}
              style={{ animationDelay: `${250 + i * 100}ms` }}
              className="animate-slide-up"
            >
              <MemoCard 
                memo={memo} 
                canDelete={true}
                onDelete={handleDeleteMemo}
                onUpdateTitle={handleUpdateTitle}
              />
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {activeTab === "all" 
                ? "No memos yet. Start recording!" 
                : "No memos match this filter"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
