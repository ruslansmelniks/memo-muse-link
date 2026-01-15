import { useCallback, useEffect, useState } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

type HapticIntensity = "light" | "medium" | "heavy";

interface HapticsOptions {
  intensity?: HapticIntensity;
}

const IMPACT_STYLE_MAP: Record<HapticIntensity, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

const VIBRATION_PATTERNS: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
};

export function useHaptics() {
  const [isNative, setIsNative] = useState(false);
  const isWebSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  useEffect(() => {
    // Check if running in a native Capacitor environment
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const isSupported = isNative || isWebSupported;

  const trigger = useCallback(
    async (options: HapticsOptions = {}) => {
      const { intensity = "medium" } = options;
      
      if (!isSupported) return;

      try {
        if (isNative) {
          // Use Capacitor Haptics for native iOS/Android
          await Haptics.impact({ style: IMPACT_STYLE_MAP[intensity] });
        } else if (isWebSupported) {
          // Fallback to browser vibration API
          const pattern = VIBRATION_PATTERNS[intensity];
          navigator.vibrate(pattern);
        }
      } catch (error) {
        // Silently fail - haptics are optional enhancement
        console.debug("Haptic feedback unavailable:", error);
      }
    },
    [isSupported, isNative, isWebSupported]
  );

  const impact = useCallback(
    async (intensity: HapticIntensity = "medium") => {
      if (!isSupported) return;

      try {
        if (isNative) {
          await Haptics.impact({ style: IMPACT_STYLE_MAP[intensity] });
        } else {
          trigger({ intensity });
        }
      } catch (error) {
        console.debug("Haptic feedback unavailable:", error);
      }
    },
    [isSupported, isNative, trigger]
  );

  const notification = useCallback(
    async (type: "success" | "warning" | "error") => {
      if (!isSupported) return;

      try {
        if (isNative) {
          // Use native notification haptics on iOS
          const notificationTypeMap: Record<string, NotificationType> = {
            success: NotificationType.Success,
            warning: NotificationType.Warning,
            error: NotificationType.Error,
          };
          await Haptics.notification({ type: notificationTypeMap[type] });
        } else if (isWebSupported) {
          // Fallback to browser vibration patterns
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
        }
      } catch (error) {
        console.debug("Haptic feedback unavailable:", error);
      }
    },
    [isSupported, isNative, isWebSupported]
  );

  const selection = useCallback(async () => {
    if (!isSupported) return;

    try {
      if (isNative) {
        // Light tap feedback for selection changes
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
      } else {
        trigger({ intensity: "light" });
      }
    } catch (error) {
      console.debug("Haptic feedback unavailable:", error);
    }
  }, [isSupported, isNative, trigger]);

  // Vibrate for a specific duration (useful for custom patterns)
  const vibrate = useCallback(
    async (duration: number = 300) => {
      if (!isSupported) return;

      try {
        if (isNative) {
          await Haptics.vibrate({ duration });
        } else if (isWebSupported) {
          navigator.vibrate(duration);
        }
      } catch (error) {
        console.debug("Haptic feedback unavailable:", error);
      }
    },
    [isSupported, isNative, isWebSupported]
  );

  return {
    isSupported,
    isNative,
    trigger,
    impact,
    notification,
    selection,
    vibrate,
  };
}
