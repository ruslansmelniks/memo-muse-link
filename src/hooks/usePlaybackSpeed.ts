import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "preferred-playback-speed";
const PLAYBACK_SPEEDS = [1, 1.2, 1.5, 2] as const;

type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

export function usePlaybackSpeed() {
  const [speed, setSpeed] = useState<PlaybackSpeed>(() => {
    if (typeof window === "undefined") return 1;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (PLAYBACK_SPEEDS.includes(parsed as PlaybackSpeed)) {
        return parsed as PlaybackSpeed;
      }
    }
    return 1;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, speed.toString());
  }, [speed]);

  const cycleSpeed = useCallback(() => {
    setSpeed((current) => {
      const currentIndex = PLAYBACK_SPEEDS.indexOf(current);
      const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
      return PLAYBACK_SPEEDS[nextIndex];
    });
  }, []);

  return {
    speed,
    setSpeed,
    cycleSpeed,
    speeds: PLAYBACK_SPEEDS,
  };
}
