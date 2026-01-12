import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";
import { MemoCard } from "./MemoCard";
import { Folder } from "@/types/folder";

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
  onUpdateTitle?: (id: string, newTitle: string) => void;
  onMoveToFolder?: (memoId: string, folderId: string | null) => void;
  folders?: Folder[];
  canDelete?: boolean;
}

export function SwipeableMemoCard({
  memo,
  onDelete,
  onUpdateTitle,
  onMoveToFolder,
  folders = [],
  canDelete = false,
}: SwipeableMemoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  const deleteOpacity = useTransform(x, [-120, -80], [1, 0]);
  const deleteScale = useTransform(x, [-120, -60], [1, 0.8]);
  const moveOpacity = useTransform(x, [80, 120], [0, 1]);
  const moveScale = useTransform(x, [60, 120], [0.8, 1]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x < -threshold && onDelete && canDelete) {
      setIsDeleting(true);
      setTimeout(() => {
        onDelete(memo.id);
      }, 200);
    } else if (info.offset.x > threshold && onMoveToFolder && folders.length > 0) {
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
  };

  return (
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
  );
}
