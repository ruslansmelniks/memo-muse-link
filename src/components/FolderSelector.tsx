import { useState, useEffect } from "react";
import { Folder, FOLDER_COLORS, FolderIcon } from "@/types/folder";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Folder as FolderIconLucide, 
  Briefcase, 
  Book, 
  Heart, 
  Star, 
  Lightbulb, 
  Music, 
  Camera, 
  Code, 
  Coffee,
  ChevronDown,
  Plus,
  Check,
  Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FolderSelectorProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateNew?: () => void;
}

const iconComponents: Record<FolderIcon, React.ElementType> = {
  folder: FolderIconLucide,
  briefcase: Briefcase,
  book: Book,
  heart: Heart,
  star: Star,
  lightbulb: Lightbulb,
  music: Music,
  camera: Camera,
  code: Code,
  coffee: Coffee,
};

export function FolderSelector({ selectedFolderId, onSelectFolder, onCreateNew }: FolderSelectorProps) {
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadFolders();
    }
  }, [user]);

  const loadFolders = async () => {
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user?.id)
      .order("name");

    if (!error && data) {
      setFolders(data as Folder[]);
    }
  };

  const getColorClass = (colorId: string) => {
    return FOLDER_COLORS.find(c => c.id === colorId)?.class || "bg-primary";
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  const handleSelect = (folderId: string | null) => {
    onSelectFolder(folderId);
    setOpen(false);
  };

  const handleCreateNew = () => {
    setOpen(false);
    onCreateNew?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            {selectedFolder ? (
              <>
                <div
                  className={cn(
                    "w-5 h-5 rounded flex items-center justify-center",
                    getColorClass(selectedFolder.color)
                  )}
                >
                  {(() => {
                    const IconComponent = iconComponents[selectedFolder.icon as FolderIcon] || FolderIconLucide;
                    return <IconComponent className="h-3 w-3 text-white" />;
                  })()}
                </div>
                <span className="truncate">{selectedFolder.name}</span>
              </>
            ) : (
              <>
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">No folder (Unfiled)</span>
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="max-h-64 overflow-auto">
          {/* Unfiled option */}
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left",
              selectedFolderId === null && "bg-muted"
            )}
          >
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">No folder (Unfiled)</span>
            {selectedFolderId === null && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </button>

          {folders.length > 0 && <div className="h-px bg-border" />}

          {/* Folder list */}
          {folders.map((folder) => {
            const IconComponent = iconComponents[folder.icon as FolderIcon] || FolderIconLucide;
            return (
              <button
                key={folder.id}
                onClick={() => handleSelect(folder.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left",
                  selectedFolderId === folder.id && "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded flex items-center justify-center",
                    getColorClass(folder.color)
                  )}
                >
                  <IconComponent className="h-3 w-3 text-white" />
                </div>
                <span className="flex-1 text-sm truncate">{folder.name}</span>
                {selectedFolderId === folder.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Create new folder */}
        {onCreateNew && (
          <>
            <div className="h-px bg-border" />
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left text-primary"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Create new folder</span>
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
