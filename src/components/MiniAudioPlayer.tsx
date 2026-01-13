import { Play, Pause, X, SkipForward, ListMusic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function MiniAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    queue,
    pause,
    resume,
    stop,
    cycleSpeed,
    seek,
    playNext,
    removeFromQueue,
    clearQueue,
  } = useAudioPlayer();

  const seekBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!seekBarRef.current || !duration) return;
      const rect = seekBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      seek(percentage * duration);
    },
    [duration, seek]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !seekBarRef.current || !duration) return;
      const rect = seekBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      seek(percentage * duration);
    },
    [isDragging, duration, seek]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true);
      handleSeek(e);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleSeek, handleMouseMove, handleMouseUp]
  );

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
            {/* Seekable progress bar at top */}
            <div
              ref={seekBarRef}
              onMouseDown={handleMouseDown}
              onClick={handleSeek}
              className="h-2 bg-muted/50 cursor-pointer group relative"
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
              {/* Seek handle */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
            
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

                {/* Queue indicator */}
                {queue.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="relative w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <ListMusic className="h-4 w-4" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                          {queue.length}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="end">
                      <div className="flex items-center justify-between mb-2 px-2">
                        <span className="text-sm font-medium">Up Next</span>
                        <button 
                          onClick={clearQueue}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {queue.map((track, i) => (
                          <div 
                            key={track.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                          >
                            <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{track.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{track.author.name}</p>
                            </div>
                            <button
                              onClick={() => removeFromQueue(track.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Skip Next */}
                {queue.length > 0 && (
                  <button
                    onClick={playNext}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                )}

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
