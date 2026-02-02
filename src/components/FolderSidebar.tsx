import { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Folder, FOLDER_COLORS, FolderIcon } from "@/types/folder";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHaptics } from "@/hooks/useHaptics";
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
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Inbox,
  LayoutGrid,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface FolderSidebarProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
  onSummarizeFolder?: (folder: Folder) => void;
  unfiledCount: number;
  totalCount: number;
  isDragging?: boolean;
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

export function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onSummarizeFolder,
  unfiledCount,
  totalCount,
  isDragging = false,
}: FolderSidebarProps) {
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const haptics = useHaptics();

  const getColorClass = (colorId: string) => {
    return FOLDER_COLORS.find(c => c.id === colorId)?.class || "bg-primary";
  };

  const handleDeleteConfirm = () => {
    if (folderToDelete) {
      haptics.notification("error");
      onDeleteFolder(folderToDelete.id);
      setFolderToDelete(null);
    }
  };

  const handleSelectFolder = (folderId: string | null) => {
    haptics.selection();
    onSelectFolder(folderId);
  };

  const handleRowPress =
    (folderId: string | null) => (event: React.TouchEvent | React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handleSelectFolder(folderId);
    };

  return (
    <>
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className={cn(
          "bg-card rounded-2xl border border-border/50 p-4 transition-all",
          isDragging && "ring-2 ring-primary/30"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {isDragging ? "Drop here" : "Folders"}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCreateFolder}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-auto max-h-[400px]">
            <div className="space-y-1">
              {/* All Memos - Not a drop target */}
              <div
                onTouchEnd={handleRowPress(null)}
                onMouseUp={handleRowPress(null)}
                role="button"
                tabIndex={0}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer active:scale-[0.98] touch-manipulation",
                  selectedFolderId === null
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="flex-1 font-medium text-sm">All Memos</span>
                <span className="text-xs text-muted-foreground">{totalCount}</span>
              </div>

              {/* Unfiled - Drop target */}
              <Droppable droppableId="unfiled">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <div
                      onTouchEnd={handleRowPress("unfiled")}
                      onMouseUp={handleRowPress("unfiled")}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer active:scale-[0.98] touch-manipulation",
                        selectedFolderId === "unfiled"
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground",
                        snapshot.isDraggingOver && "bg-primary/20 ring-2 ring-primary"
                      )}
                    >
                      <Inbox className="h-4 w-4" />
                      <span className="flex-1 font-medium text-sm">Unfiled</span>
                      <span className="text-xs text-muted-foreground">{unfiledCount}</span>
                    </div>
                    <div className="hidden">{provided.placeholder}</div>
                  </div>
                )}
              </Droppable>

              {/* Divider */}
              {folders.length > 0 && (
                <div className="h-px bg-border my-2" />
              )}

              {/* Folder List - Each is a drop target */}
              {folders.map((folder) => {
                const IconComponent = iconComponents[folder.icon as FolderIcon] || FolderIconLucide;
                return (
                  <Droppable key={folder.id} droppableId={folder.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "group flex items-center gap-2 rounded-xl transition-all",
                          selectedFolderId === folder.id
                            ? "bg-primary/10"
                            : "hover:bg-muted",
                          snapshot.isDraggingOver && "bg-primary/20 ring-2 ring-primary"
                        )}
                      >
                        <div 
                          className="flex-1 flex items-center gap-3 px-3 py-2.5 cursor-pointer active:scale-[0.98] touch-manipulation"
                          onTouchEnd={handleRowPress(folder.id)}
                          onMouseUp={handleRowPress(folder.id)}
                          role="button"
                          tabIndex={0}
                        >
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center transition-transform",
                              getColorClass(folder.color),
                              snapshot.isDraggingOver && "scale-110"
                            )}
                          >
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "font-medium text-sm truncate",
                                  selectedFolderId === folder.id
                                    ? "text-primary"
                                    : "text-foreground"
                                )}
                              >
                                {folder.name}
                              </span>
                              {folder.is_public ? (
                                <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {folder.memo_count || 0}
                          </span>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onSummarizeFolder && (folder.memo_count || 0) > 0 && (
                              <DropdownMenuItem onClick={() => onSummarizeFolder(folder)}>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Summarize folder
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onEditFolder(folder)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit folder
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setFolderToDelete(folder)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete folder
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="hidden">{provided.placeholder}</div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the folder "{folderToDelete?.name}". Memos inside will become unfiled but won't be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
