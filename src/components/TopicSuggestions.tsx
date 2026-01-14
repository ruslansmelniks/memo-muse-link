import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRandomTopics, RecordingTopic } from "@/data/recordingTopics";

interface TopicSuggestionsProps {
  isRecording: boolean;
}

export function TopicSuggestions({ isRecording }: TopicSuggestionsProps) {
  const [topics, setTopics] = useState<RecordingTopic[]>(() => getRandomTopics(3));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    const currentIds = topics.map(t => t.id);
    
    // Small delay for animation
    setTimeout(() => {
      setTopics(getRandomTopics(3, currentIds));
      setIsRefreshing(false);
    }, 300);
  }, [topics]);

  if (isRecording) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-10 text-center"
      >
        {/* Header */}
        <motion.div 
          className="flex items-center justify-center gap-2 mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Sparkles className="h-4 w-4 text-primary/70" />
          <span className="text-sm text-muted-foreground font-medium">
            Need inspiration?
          </span>
        </motion.div>

        {/* Topic Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-5 max-w-md mx-auto">
          <AnimatePresence mode="popLayout">
            {topics.map((topic, index) => (
              <motion.button
                key={topic.id}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ 
                  opacity: isRefreshing ? 0.5 : 1, 
                  scale: 1, 
                  y: 0 
                }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ 
                  duration: 0.25, 
                  delay: index * 0.08,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2 px-4 py-2.5 
                  bg-muted/50 hover:bg-muted/80 
                  border border-border/50 hover:border-border
                  rounded-full text-sm text-foreground/80 hover:text-foreground
                  transition-colors duration-200 cursor-default"
                disabled={isRefreshing}
              >
                <span className="text-base">{topic.icon}</span>
                <span className="font-medium">{topic.text}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-muted-foreground hover:text-foreground gap-2 h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs">More ideas</span>
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
