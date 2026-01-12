import { useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { MemoCard } from "@/components/MemoCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { mockMemos, categories } from "@/data/mockData";

export function DiscoverView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const publicMemos = mockMemos.filter(m => m.isPublic);
  
  const filteredMemos = publicMemos.filter(memo => {
    const matchesCategory = !selectedCategory || 
      memo.categories.some(c => 
        categories.find(cat => cat.id === selectedCategory)?.name === c
      );
    const matchesSearch = !searchQuery || 
      memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memo.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-6 pb-32">
      {/* Header */}
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
        {filteredMemos.map((memo, i) => (
          <div 
            key={memo.id}
            style={{ animationDelay: `${250 + i * 100}ms` }}
            className="animate-slide-up"
          >
            <MemoCard memo={memo} />
          </div>
        ))}
        
        {filteredMemos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No memos found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
