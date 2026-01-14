import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Sparkles, Tag, MessageSquare, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Memo {
  id: string;
  title: string;
  transcript: string;
  summary: string | null;
  categories: string[];
  tasks: string[];
  duration: number;
  createdAt: Date;
}

interface StatsModalsProps {
  memos: Memo[];
  openModal: "time" | "nuggets" | "topics" | null;
  onClose: () => void;
}

export function LibraryStatsModals({ memos, openModal, onClose }: StatsModalsProps) {
  // Aggregate all nuggets from memos
  const allNuggets = useMemo(() => {
    return memos.flatMap(memo => 
      memo.tasks.map(task => ({
        text: task,
        memoTitle: memo.title,
        memoId: memo.id,
        date: memo.createdAt,
      }))
    ).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [memos]);

  // Aggregate all categories with counts
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    memos.forEach(memo => {
      memo.categories.forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [memos]);

  // Create a summary of what the person has been talking about
  const talkingSummary = useMemo(() => {
    const totalMemos = memos.length;
    const totalMinutes = Math.round(memos.reduce((acc, m) => acc + m.duration, 0) / 60);
    
    // Get recent memo summaries (last 5)
    const recentSummaries = memos
      .slice(0, 5)
      .map(m => m.summary || m.transcript.slice(0, 100))
      .filter(Boolean);
    
    // Get most common topics
    const topCategories = categoryStats.slice(0, 3).map(c => c.name);
    
    return {
      totalMemos,
      totalMinutes,
      recentSummaries,
      topCategories,
    };
  }, [memos, categoryStats]);

  return (
    <>
      {/* Time/Recording Summary Modal */}
      <Dialog open={openModal === "time"} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-mint flex items-center justify-center">
                <Clock className="h-4 w-4 text-mint-400" />
              </div>
              Recording Overview
            </DialogTitle>
            <DialogDescription>
              A summary of what you've been recording about
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Stats Row */}
            <div className="flex gap-4">
              <div className="flex-1 bg-muted/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{talkingSummary.totalMinutes}m</p>
                <p className="text-xs text-muted-foreground">recorded</p>
              </div>
              <div className="flex-1 bg-muted/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{talkingSummary.totalMemos}</p>
                <p className="text-xs text-muted-foreground">memos</p>
              </div>
            </div>

            {/* What you've been talking about */}
            {talkingSummary.topCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Main themes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {talkingSummary.topCategories.map((cat, i) => (
                    <Badge key={cat} variant="secondary" className="text-sm">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent summaries */}
            {talkingSummary.recentSummaries.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  Recent thoughts
                </h4>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-3 pr-4">
                    {talkingSummary.recentSummaries.map((summary, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50"
                      >
                        {summary}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {memos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recordings yet</p>
                <p className="text-sm">Start recording to see your summary here</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nuggets Modal */}
      <Dialog open={openModal === "nuggets"} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-lavender flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-lavender-400" />
              </div>
              Your Nuggets
            </DialogTitle>
            <DialogDescription>
              Key insights and action items extracted from your memos
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3 py-4">
              {allNuggets.length > 0 ? (
                allNuggets.map((nugget, i) => (
                  <motion.div
                    key={`${nugget.memoId}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border/50"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{nugget.text}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        from "{nugget.memoTitle}"
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No nuggets yet</p>
                  <p className="text-sm">AI extracts key insights from your recordings</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Topics/Categories Modal */}
      <Dialog open={openModal === "topics"} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
                <Tag className="h-4 w-4 text-primary-foreground" />
              </div>
              Your Topics
            </DialogTitle>
            <DialogDescription>
              Categories and themes you've been exploring
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3 py-4">
              {categoryStats.length > 0 ? (
                categoryStats.map((cat, i) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: `hsl(${(i * 47) % 360}, 60%, 60%)` 
                        }}
                      />
                      <span className="font-medium text-foreground">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{cat.count} memo{cat.count !== 1 ? 's' : ''}</span>
                      <div 
                        className="h-2 rounded-full bg-primary/20"
                        style={{ 
                          width: `${Math.max(20, (cat.count / Math.max(...categoryStats.map(c => c.count))) * 60)}px`
                        }}
                      >
                        <div 
                          className="h-full rounded-full bg-primary"
                          style={{ 
                            width: `${(cat.count / Math.max(...categoryStats.map(c => c.count))) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No topics yet</p>
                  <p className="text-sm">AI categorizes your recordings automatically</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
