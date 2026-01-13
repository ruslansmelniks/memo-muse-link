import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

export interface AudioTrack {
  id: string;
  title: string;
  audioUrl: string;
  author: {
    name: string;
    avatar?: string;
  };
  duration: number;
}

interface AudioPlayerContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  queue: AudioTrack[];
  play: (track: AudioTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: number) => void;
  cycleSpeed: () => void;
  isCurrentTrack: (id: string) => boolean;
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  playNext: () => void;
  isInQueue: (id: string) => boolean;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

const PLAYBACK_SPEEDS = [1, 1.2, 1.5, 2];

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element with iOS Safari compatibility
  useEffect(() => {
    const audio = new Audio();
    
    // iOS Safari specific attributes
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.preload = "auto";
    
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    audio.onpause = () => setIsPlaying(false);
    audio.onplay = () => setIsPlaying(true);
    audio.onerror = (e) => console.error("Audio error:", e);
    audio.onstalled = () => {
      console.log("Audio stalled, reloading...");
      audio.load();
    };
    
    audioRef.current = audio;
    
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Handle track ended - play next in queue
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Auto-play next track in queue
      if (queue.length > 0) {
        const nextTrack = queue[0];
        setQueue(prev => prev.slice(1));
        setCurrentTrack(nextTrack);
        audio.src = nextTrack.audioUrl;
        audio.playbackRate = playbackSpeed;
        audio.play().catch(console.error);
      }
    };

    audio.onended = handleEnded;
    return () => {
      audio.onended = null;
    };
  }, [queue, playbackSpeed]);

  const play = useCallback(async (track: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    // If same track, just resume
    if (currentTrack?.id === track.id && audio.src) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Resume playback error:", error);
        // iOS fix: reload and try again
        audio.load();
        await audio.play().catch(console.error);
      }
      return;
    }

    // Load new track with iOS compatibility
    setCurrentTrack(track);
    audio.src = track.audioUrl;
    audio.playbackRate = playbackSpeed;
    
    // Explicitly load before playing (required for iOS Safari)
    audio.load();
    
    try {
      await audio.play();
    } catch (error) {
      console.error("Playback error:", error);
      // Retry once after a short delay (iOS workaround)
      setTimeout(async () => {
        try {
          await audio.play();
        } catch (retryError) {
          console.error("Retry playback failed:", retryError);
        }
      }, 100);
    }
  }, [currentTrack, playbackSpeed]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play();
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }
    setCurrentTrack(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const cycleSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const nextSpeed = PLAYBACK_SPEEDS[nextIndex];
    setSpeed(nextSpeed);
  }, [playbackSpeed, setSpeed]);

  const isCurrentTrack = useCallback((id: string) => {
    return currentTrack?.id === id;
  }, [currentTrack]);

  const addToQueue = useCallback((track: AudioTrack) => {
    // Don't add duplicates
    setQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue(prev => prev.filter(t => t.id !== trackId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) {
      stop();
      return;
    }
    
    const nextTrack = queue[0];
    setQueue(prev => prev.slice(1));
    play(nextTrack);
  }, [queue, play, stop]);

  const isInQueue = useCallback((id: string) => {
    return queue.some(t => t.id === id);
  }, [queue]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        playbackSpeed,
        queue,
        play,
        pause,
        resume,
        stop,
        seek,
        setSpeed,
        cycleSpeed,
        isCurrentTrack,
        addToQueue,
        removeFromQueue,
        clearQueue,
        playNext,
        isInQueue,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}
