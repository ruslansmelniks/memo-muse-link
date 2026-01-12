import { useState, useEffect, useCallback } from "react";
import { Search, TrendingUp } from "lucide-react";
import { MemoCard } from "@/components/MemoCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { PullToRefreshIndicator } from "@/components/PullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { categories } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
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

export function DiscoverView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPublicMemos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memos")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

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
        author: { name: m.author_name },
        likes: m.likes,
        comments: 0,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPublicMemos();
  }, [loadPublicMemos]);

  const handleRefresh = useCallback(async () => {
    await loadPublicMemos();
    toast.success("Refreshed");
  }, [loadPublicMemos]);

  const { containerRef, pullDistance, isRefreshing, progress, shouldRefresh } = usePullToRefresh({
    onRefresh: handleRefresh,
  });
  
  const filteredMemos = memos.filter(memo => {
    const matchesCategory = !selectedCategory || 
      memo.categories.some(c => 
        categories.find(cat => cat.id === selectedCategory)?.name === c
      );
    const matchesSearch = !searchQuery || 
      memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.summary || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div 
      ref={containerRef}
      className="container mx-auto px-4 py-6 pb-32 relative overflow-auto"
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
      <div className="mb-6 animate-fade-in">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">
          Discover Ideas
        </h2>
        <p className="text-muted-foreground">
          Find people with similar thoughts and start conversations
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ideas, topics, thoughts..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />
      </div>

      {/* Categories */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
        <CategoryFilter 
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {/* Trending Section */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold text-lg text-foreground">
            Trending Now
          </h3>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["Community gardens", "Mindfulness apps", "Side projects", "Morning routines"].map((topic) => (
            <button
              key={topic}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap gradient-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Memos Grid */}
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
              <MemoCard memo={memo} />
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory 
                ? "No memos found matching your criteria" 
                : "No public memos yet. Be the first to share!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
