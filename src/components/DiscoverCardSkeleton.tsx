import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface DiscoverCardSkeletonProps {
  index?: number;
}

export function DiscoverCardSkeleton({ index = 0 }: DiscoverCardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <Card className="bg-card rounded-2xl border border-border/50 shadow-sm">
        <CardContent className="p-6">
          {/* Author Row Skeleton */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>

          {/* Title Skeleton */}
          <Skeleton className="h-6 w-3/4 mb-3" />

          {/* Summary Skeleton */}
          <div className="space-y-2 mb-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Player Skeleton */}
          <div className="bg-muted/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0 h-10 flex items-end gap-[2px]">
                {Array.from({ length: 30 }).map((_, i) => (
                  <Skeleton 
                    key={i} 
                    className="flex-1 min-w-[2px] max-w-[4px] rounded-full"
                    style={{ height: `${20 + Math.random() * 60}%` }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Skeleton className="h-4 w-9" />
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
            </div>
          </div>

          {/* Bottom Row Skeleton */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
