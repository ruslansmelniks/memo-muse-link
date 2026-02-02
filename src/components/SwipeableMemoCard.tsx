import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemoCard } from "./MemoCard";
import { Folder } from "@/types/folder";
import { useHaptics } from "@/hooks/useHaptics";
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

interface SwipeableMemoCardProps {
  memo: {
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
    folderId?: string | null;
  };
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onUpdateTitle?: (id: string, newTitle: string) => void;
  onMoveToFolder?: (memoId: string, folderId: string | null) => void;
  folders?: Folder[];
  canDelete?: boolean;
}

export function SwipeableMemoCard({
  memo,
  onDelete,
  onArchive,
  onUpdateTitle,
  onMoveToFolder,
  folders = [],
  canDelete = false,
}: SwipeableMemoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const haptics = useHaptics();
  
  const deleteOpacity = useTransform(x, [-120, -80], [1, 0]);
  const deleteScale = useTransform(x, [-120, -60], [1, 0.8]);
  const moveOpacity = useTransform(x, [80, 120], [0, 1]);
  const moveScale = useTransform(x, [60, 120], [0.8, 1]);

  // Trigger haptic when crossing threshold
  useEffect(() => {
    const unsubscribe = x.on("change", (latest) => {
      const threshold = 100;
      const crossedThreshold = Math.abs(latest) >= threshold;
      
      if (crossedThreshold && !hasTriggeredHaptic) {
        haptics.impact("medium");
        setHasTriggeredHaptic(true);
      } else if (!crossedThreshold && hasTriggeredHaptic) {
        setHasTriggeredHaptic(false);
      }
    });
    
    return () => unsubscribe();
  }, [x, hasTriggeredHaptic, haptics]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x < -threshold && canDelete) {
      haptics.notification("warning");
      // Show confirmation dialog instead of immediate delete
      setShowDeleteConfirm(true);
    } else if (info.offset.x > threshold && onMoveToFolder && folders.length > 0) {
      haptics.notification("success");
      // Move to next folder or unfiled
      const currentFolderIndex = folders.findIndex(f => f.id === memo.folderId);
      if (currentFolderIndex === -1) {
        // Currently unfiled, move to first folder
        onMoveToFolder(memo.id, folders[0].id);
      } else if (currentFolderIndex < folders.length - 1) {
        // Move to next folder
        onMoveToFolder(memo.id, folders[currentFolderIndex + 1].id);
      } else {
        // At last folder, move to unfiled
        onMoveToFolder(memo.id, null);
      }
    }
    
    setHasTriggeredHaptic(false);
  };

  const handleConfirmDelete = () => {
    haptics.notification("error");
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    setTimeout(() => {
      // Use onArchive if available (moves to deleted), otherwise use onDelete
      if (onArchive) {
        onArchive(memo.id);
      } else if (onDelete) {
        onDelete(memo.id);
      }
    }, 200);
  };

  return (
    <>
      <div ref={constraintsRef} className="relative overflow-hidden rounded-2xl">
        {/* Delete Action (swipe left) */}
        <motion.div
          className="absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-destructive rounded-r-2xl"
          style={{ opacity: deleteOpacity }}
        >
          <motion.div style={{ scale: deleteScale }}>
            <Trash2 className="h-6 w-6 text-destructive-foreground" />
          </motion.div>
        </motion.div>
        
        {/* Move Action (swipe right) */}
        <motion.div
          className="absolute inset-y-0 left-0 w-24 flex items-center justify-center bg-primary rounded-l-2xl"
          style={{ opacity: moveOpacity }}
        >
          <motion.div style={{ scale: moveScale }}>
            <FolderInput className="h-6 w-6 text-primary-foreground" />
          </motion.div>
        </motion.div>
        
        {/* Card Content */}
        <motion.div
          drag="x"
          dragConstraints={{ left: -150, right: 150 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ x }}
          animate={isDeleting ? { x: -500, opacity: 0 } : {}}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn(
            "relative bg-background touch-pan-y",
            isDeleting && "pointer-events-none"
          )}
          whileTap={{ cursor: "grabbing" }}
        >
          <MemoCard
            memo={memo}
            canDelete={canDelete}
            onDelete={onDelete}
            onUpdateTitle={onUpdateTitle}
            onMoveToFolder={onMoveToFolder}
            folders={folders}
          />
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Deleted?</AlertDialogTitle>
            <AlertDialogDescription>
              This memo will be moved to your Deleted folder. You can restore it later or permanently delete it from there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Deleted
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
