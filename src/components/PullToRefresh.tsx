import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
  shouldRefresh: boolean;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  progress,
  shouldRefresh,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <motion.div
      className="absolute left-0 right-0 flex items-center justify-center z-20 pointer-events-none"
      style={{
        top: pullDistance - 48,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: progress > 0.2 ? 1 : progress * 5 }}
    >
      <motion.div
        className={cn(
          "w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center",
          shouldRefresh && "bg-primary/10 border-primary/30"
        )}
        animate={{
          rotate: isRefreshing ? 360 : progress * 180,
        }}
        transition={{
          rotate: isRefreshing
            ? { repeat: Infinity, duration: 0.8, ease: "linear" }
            : { duration: 0 },
        }}
      >
        <RefreshCw
          className={cn(
            "h-5 w-5 text-muted-foreground transition-colors",
            shouldRefresh && "text-primary",
            isRefreshing && "text-primary"
          )}
        />
      </motion.div>
    </motion.div>
  );
}
