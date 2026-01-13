import { Play, Pause, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function MiniAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    pause,
    resume,
    stop,
    cycleSpeed,
  } = useAudioPlayer();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-16 left-0 right-0 z-40 px-2"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-lg overflow-hidden max-w-lg mx-auto">
            {/* Progress bar at top */}
            <Progress 
              value={progress} 
              className="h-1 rounded-none bg-muted/50"
            />
            
            <div className="flex items-center gap-3 p-3">
              {/* Avatar */}
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={currentTrack.author.avatar} alt={currentTrack.author.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {currentTrack.author.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentTrack.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{currentTrack.author.name}</span>
                  <span>•</span>
                  <span className="tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration || currentTrack.duration)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Speed */}
                <button
                  onClick={cycleSpeed}
                  className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {playbackSpeed}x
                </button>

                {/* Play/Pause */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={isPlaying ? pause : resume}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </motion.button>

                {/* Close */}
                <button
                  onClick={stop}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
