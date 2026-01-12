import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  barCount?: number;
}

export function AudioWaveform({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onSeek,
  barCount = 40,
}: AudioWaveformProps) {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate waveform data from audio
  useEffect(() => {
    const generateWaveform = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const samplesPerBar = Math.floor(channelData.length / barCount);
        const bars: number[] = [];
        
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          const start = i * samplesPerBar;
          const end = start + samplesPerBar;
          
          for (let j = start; j < end; j++) {
            sum += Math.abs(channelData[j]);
          }
          
          const average = sum / samplesPerBar;
          bars.push(average);
        }
        
        // Normalize the values
        const maxVal = Math.max(...bars);
        const normalized = bars.map(v => Math.max(0.1, v / maxVal));
        
        setWaveformData(normalized);
        audioContext.close();
      } catch (error) {
        console.error("Error generating waveform:", error);
        // Generate placeholder waveform on error
        const placeholder = Array(barCount).fill(0).map(() => 
          0.2 + Math.random() * 0.6
        );
        setWaveformData(placeholder);
      } finally {
        setIsLoading(false);
      }
    };

    if (audioUrl) {
      generateWaveform();
    }
  }, [audioUrl, barCount]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * duration;
    
    onSeek(Math.max(0, Math.min(seekTime, duration)));
  }, [duration, onSeek]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-[2px] h-10">
        {Array(barCount).fill(0).map((_, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full bg-muted animate-pulse"
            style={{ 
              height: `${20 + Math.random() * 60}%`,
              animationDelay: `${i * 30}ms`
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative flex items-center justify-center gap-[2px] h-10 cursor-pointer group"
    >
      {waveformData.map((amplitude, i) => {
        const barProgress = (i / barCount) * 100;
        const isPast = barProgress < progress;
        
        return (
          <div
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-all duration-150",
              isPast ? "gradient-primary" : "bg-muted",
              isPlaying && isPast && "animate-pulse-soft"
            )}
            style={{ 
              height: `${amplitude * 100}%`,
              opacity: isPast ? 1 : 0.5,
            }}
          />
        );
      })}
      
      {/* Hover indicator */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute top-0 bottom-0 w-[2px] bg-primary/50 hidden group-hover:block" 
          style={{ left: `${progress}%` }} 
        />
      </div>
    </div>
  );
}
