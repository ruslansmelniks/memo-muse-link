import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Clock, Sparkles, GripVertical, Search, X, Bookmark, Tag } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { LibraryStatsModals } from "@/components/LibraryStatsModals";
import { MemoCard } from "@/components/MemoCard";
import { SwipeableMemoCard } from "@/components/SwipeableMemoCard";
import { FolderSidebar } from "@/components/FolderSidebar";
import { FolderModal } from "@/components/FolderModal";
import { FolderSummaryModal } from "@/components/FolderSummaryModal";
import { PullToRefreshIndicator } from "@/components/PullToRefresh";
import { SavedMemosSection } from "@/components/SavedMemosSection";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Folder } from "@/types/folder";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FolderSummary {
  overview: string;
  themes: string[];
  nuggets: string[];
  connections: string;
}

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
  author: { name: string; avatar?: string };
  likes: number;
  comments: number;
  folderId?: string | null;
}


export function LibraryView() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [folderSummary, setFolderSummary] = useState<FolderSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizingFolder, setSummarizingFolder] = useState<Folder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [openStatsModal, setOpenStatsModal] = useState<"time" | "nuggets" | "topics" | null>(null);
  const { user } = useAuth();
  const { getDisplayName, getAvatarUrl } = useProfile();
  const isMobile = useIsMobile();

  const handleRefresh = useCallback(async () => {
    await loadData();
    toast.success("Refreshed");
  }, []);

  const { containerRef, pullDistance, isRefreshing, progress, shouldRefresh } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setMemos([]);
      setFolders([]);
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadMemos(), loadFolders()]);
    setLoading(false);
  };

  const loadMemos = async () => {
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
        author: { name: getDisplayName(), avatar: getAvatarUrl() || undefined },
        likes: m.likes,
        comments: 0,
        folderId: m.folder_id,
      })));
    }
  };

  const loadFolders = async () => {
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user?.id)
      .order("name");

    if (error) {
      console.error("Error loading folders:", error);
    } else if (data) {
      const foldersWithCounts = data.map(f => ({
        ...f,
        memo_count: memos.filter(m => m.folderId === f.id).length
      }));
      setFolders(foldersWithCounts as Folder[]);
    }
  };

  // Recalculate folder counts when memos change
  useEffect(() => {
    if (folders.length > 0) {
      setFolders(prev => prev.map(f => ({
        ...f,
        memo_count: memos.filter(m => m.folderId === f.id).length
      })));
    }
  }, [memos]);

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

  const handleMoveToFolder = async (memoId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("memos")
        .update({ folder_id: folderId })
        .eq("id", memoId);

      if (error) throw error;

      setMemos(memos.map(m => m.id === memoId ? { ...m, folderId } : m));
      
      const folderName = folderId 
        ? folders.find(f => f.id === folderId)?.name 
        : "Unfiled";
      toast.success(`Moved to ${folderName}`);
    } catch (error) {
      console.error("Move error:", error);
      toast.error("Failed to move memo");
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const destinationId = destination.droppableId;
    
    // Determine target folder
    let targetFolderId: string | null = null;
    if (destinationId !== "unfiled" && destinationId !== "all-memos") {
      targetFolderId = destinationId;
    }
    
    // Find memo and check if it's actually changing
    const memo = memos.find(m => m.id === draggableId);
    if (!memo || memo.folderId === targetFolderId) return;
    
    await handleMoveToFolder(draggableId, targetFolderId);
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setShowFolderModal(true);
  };

  const handleSaveFolder = async (data: { 
    name: string; 
    description?: string; 
    icon: string; 
    color: string; 
    is_public: boolean 
  }) => {
    setIsSavingFolder(true);
    try {
      if (editingFolder) {
        const { error } = await supabase
          .from("folders")
          .update(data)
          .eq("id", editingFolder.id);

        if (error) throw error;

        setFolders(folders.map(f => 
          f.id === editingFolder.id ? { ...f, ...data } : f
        ));
        toast.success("Folder updated");
      } else {
        const { data: newFolder, error } = await supabase
          .from("folders")
          .insert({ ...data, user_id: user?.id })
          .select()
          .single();

        if (error) throw error;

        setFolders([...folders, { ...newFolder, memo_count: 0 } as Folder]);
        toast.success("Folder created");
      }
      setShowFolderModal(false);
    } catch (error) {
      console.error("Folder save error:", error);
      toast.error("Failed to save folder");
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;

      setFolders(folders.filter(f => f.id !== folderId));
      setMemos(memos.map(m => m.folderId === folderId ? { ...m, folderId: null } : m));
      
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      toast.success("Folder deleted");
    } catch (error) {
      console.error("Delete folder error:", error);
      toast.error("Failed to delete folder");
    }
  };

  const handleSummarizeFolder = async (folder: Folder) => {
    const folderMemos = memos.filter(m => m.folderId === folder.id);
    
    if (folderMemos.length === 0) {
      toast.error("This folder has no memos to summarize");
      return;
    }

    setSummarizingFolder(folder);
    setFolderSummary(null);
    setShowSummaryModal(true);
    setIsSummarizing(true);

    try {
      const payload = {
        folderName: folder.name,
        memos: folderMemos.map(m => ({
          title: m.title,
          summary: m.summary,
          nuggets: m.tasks,
          createdAt: m.createdAt.toISOString(),
        })),
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-folder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("Credits exhausted. Please add funds to continue.");
        }
        throw new Error(errorData.error || "Failed to summarize folder");
      }

      const data = await response.json();
      setFolderSummary(data.summary);
    } catch (error) {
      console.error("Summarize error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to summarize folder");
      setShowSummaryModal(false);
    } finally {
      setIsSummarizing(false);
    }
  };

  const getFilteredMemos = () => {
    let filtered = memos;

    // Filter by folder
    if (selectedFolderId === "unfiled") {
      filtered = filtered.filter(m => !m.folderId);
    } else if (selectedFolderId) {
      filtered = filtered.filter(m => m.folderId === selectedFolderId);
    }

    // Filter by search query (using debounced value)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.transcript.toLowerCase().includes(query) ||
        (m.summary?.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const filteredMemos = getFilteredMemos();
  const totalDuration = memos.reduce((acc, m) => acc + m.duration, 0);
  const totalTasks = memos.reduce((acc, m) => acc + m.tasks.length, 0);
  const unfiledCount = memos.filter(m => !m.folderId).length;
  
  // Count unique categories
  const uniqueCategories = new Set(memos.flatMap(m => m.categories));
  const totalTopics = uniqueCategories.size;

  const selectedFolder = selectedFolderId && selectedFolderId !== "unfiled" 
    ? folders.find(f => f.id === selectedFolderId) 
    : null;

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
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
        {/* Tabs */}
        <Tabs defaultValue="my-memos" className="w-full">
          <TabsList className="mb-8 bg-muted/50">
            <TabsTrigger value="my-memos" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              My Memos
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="h-4 w-4" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-memos" className="mt-0">
            <div className="mb-8 animate-fade-in">
              <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                {selectedFolder ? selectedFolder.name : selectedFolderId === "unfiled" ? "Unfiled Memos" : "Your Library"}
              </h2>
              <p className="text-muted-foreground">
                {selectedFolder || selectedFolderId === "unfiled" 
                  ? `${filteredMemos.length} memos`
                  : `${memos.length} memos · ${totalTasks} nuggets found`
                }
              </p>
              {isDragging && (
                <p className="text-sm text-primary mt-2 animate-fade-in">
                  Drop on a folder in the sidebar to move
                </p>
              )}
            </div>

        {/* Search Bar */}
        <div className="relative mb-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memos by title or content..."
            className="w-full pl-12 pr-10 py-3 rounded-2xl bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Folder Sidebar with drop zones */}
          <FolderSidebar
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onEditFolder={handleEditFolder}
            onDeleteFolder={handleDeleteFolder}
            onSummarizeFolder={handleSummarizeFolder}
            unfiledCount={unfiledCount}
            totalCount={memos.length}
            isDragging={isDragging}
          />

          {/* Main Content */}
          <div className="flex-1">
            {/* Stats Cards - Only show when viewing all */}
            {!selectedFolderId && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <button 
                  onClick={() => setOpenStatsModal("time")}
                  className="glass-card rounded-2xl p-4 animate-fade-in text-left hover:bg-muted/50 transition-colors group"
                  style={{ animationDelay: "150ms" }}
                >
                  <div className="w-10 h-10 rounded-xl gradient-mint flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Clock className="h-5 w-5 text-mint-400" />
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {Math.round(totalDuration / 60)}m
                  </p>
                  <p className="text-xs text-muted-foreground">Total recorded</p>
                </button>
                
                <button 
                  onClick={() => setOpenStatsModal("nuggets")}
                  className="glass-card rounded-2xl p-4 animate-fade-in text-left hover:bg-muted/50 transition-colors group"
                  style={{ animationDelay: "200ms" }}
                >
                  <div className="w-10 h-10 rounded-xl gradient-lavender flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-5 w-5 text-lavender-400" />
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {totalTasks}
                  </p>
                  <p className="text-xs text-muted-foreground">Nuggets</p>
                </button>

                <button 
                  onClick={() => setOpenStatsModal("topics")}
                  className="glass-card rounded-2xl p-4 animate-fade-in text-left hover:bg-muted/50 transition-colors group"
                  style={{ animationDelay: "250ms" }}
                >
                  <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Tag className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {totalTopics}
                  </p>
                  <p className="text-xs text-muted-foreground">Topics</p>
                </button>
              </div>
            )}
            
            {/* Stats Modals */}
            <LibraryStatsModals 
              memos={memos}
              openModal={openStatsModal}
              onClose={() => setOpenStatsModal(null)}
            />

            {/* Memos List - Droppable area */}
            <Droppable droppableId={selectedFolderId || "all-memos"}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "space-y-4 min-h-[200px] rounded-2xl transition-colors",
                    snapshot.isDraggingOver && "bg-primary/5"
                  )}
                >
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading...</p>
                    </div>
                  ) : filteredMemos.length > 0 ? (
                    isMobile ? (
                      // Mobile: Swipeable cards
                      filteredMemos.map((memo, i) => (
                        <div
                          key={memo.id}
                          className="animate-slide-up"
                          style={{ animationDelay: `${250 + i * 100}ms` }}
                        >
                          <SwipeableMemoCard
                            memo={memo}
                            canDelete={true}
                            onDelete={handleDeleteMemo}
                            onUpdateTitle={handleUpdateTitle}
                            onMoveToFolder={handleMoveToFolder}
                            folders={folders}
                          />
                        </div>
                      ))
                    ) : (
                      // Desktop: Draggable cards
                      filteredMemos.map((memo, i) => (
                        <Draggable key={memo.id} draggableId={memo.id} index={i}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "animate-slide-up",
                                snapshot.isDragging && "opacity-90 shadow-lg"
                              )}
                              style={{
                                ...provided.draggableProps.style,
                                animationDelay: `${250 + i * 100}ms`,
                              }}
                            >
                              <div className="relative group">
                                {/* Drag Handle */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex items-center justify-center w-6 h-10 rounded-l-lg bg-muted hover:bg-muted/80"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <MemoCard 
                                  memo={memo} 
                                  canDelete={true}
                                  onDelete={handleDeleteMemo}
                                  onUpdateTitle={handleUpdateTitle}
                                  onMoveToFolder={handleMoveToFolder}
                                  folders={folders}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        {selectedFolderId === "unfiled"
                          ? "No unfiled memos. All your memos are organized!"
                          : "No memos yet. Start recording!"}
                      </p>
                    </div>
                  )}
                  {!isMobile && provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            <div className="mb-6 animate-fade-in">
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                Saved Memos
              </h2>
              <p className="text-muted-foreground">
                Memos you've bookmarked from Discover
              </p>
            </div>
            <SavedMemosSection />
          </TabsContent>
        </Tabs>

        {/* Folder Modal */}
        <FolderModal
          isOpen={showFolderModal}
          onClose={() => setShowFolderModal(false)}
          onSave={handleSaveFolder}
          folder={editingFolder}
          isLoading={isSavingFolder}
        />

        {/* Folder Summary Modal */}
        <FolderSummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          folderName={summarizingFolder?.name || ""}
          summary={folderSummary}
          isLoading={isSummarizing}
          memoCount={summarizingFolder ? memos.filter(m => m.folderId === summarizingFolder.id).length : 0}
        />
      </div>
    </DragDropContext>
  );
}
