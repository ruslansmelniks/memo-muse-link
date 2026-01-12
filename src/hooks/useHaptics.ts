import { useCallback } from "react";

type HapticIntensity = "light" | "medium" | "heavy";

interface HapticsOptions {
  intensity?: HapticIntensity;
}

const VIBRATION_PATTERNS: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
};

export function useHaptics() {
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  const trigger = useCallback(
    (options: HapticsOptions = {}) => {
      const { intensity = "medium" } = options;
      
      if (!isSupported) return;

      try {
        const pattern = VIBRATION_PATTERNS[intensity];
        navigator.vibrate(pattern);
      } catch (error) {
        // Silently fail - haptics are optional enhancement
        console.debug("Haptic feedback unavailable:", error);
      }
    },
    [isSupported]
  );

  const impact = useCallback(
    (intensity: HapticIntensity = "medium") => {
      trigger({ intensity });
    },
    [trigger]
  );

  const notification = useCallback(
    (type: "success" | "warning" | "error") => {
      if (!isSupported) return;

      try {
        switch (type) {
          case "success":
            navigator.vibrate([15, 50, 15]);
            break;
          case "warning":
            navigator.vibrate([30, 50, 30]);
            break;
          case "error":
            navigator.vibrate([50, 100, 50, 100, 50]);
            break;
        }
      } catch (error) {
        console.debug("Haptic feedback unavailable:", error);
      }
    },
    [isSupported]
  );

  const selection = useCallback(() => {
    trigger({ intensity: "light" });
  }, [trigger]);

  return {
    isSupported,
    trigger,
    impact,
    notification,
    selection,
  };
}
