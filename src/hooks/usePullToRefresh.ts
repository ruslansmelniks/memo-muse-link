import { useState, useRef, useCallback, useEffect } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredThresholdHaptic = useRef(false);
  const isNative = Capacitor.isNativePlatform();

  // Haptic feedback helpers
  const triggerHaptic = useCallback(async (type: "threshold" | "start" | "complete") => {
    if (!isNative) return;
    
    try {
      switch (type) {
        case "threshold":
          // Light tap when reaching threshold
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case "start":
          // Medium impact when refresh starts
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case "complete":
          // Success notification when done
          await Haptics.notification({ type: NotificationType.Success });
          break;
      }
    } catch (error) {
      // Silently fail
    }
  }, [isNative]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      hasTriggeredThresholdHaptic.current = false;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return;
      if (containerRef.current && containerRef.current.scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && startY.current > 0) {
        e.preventDefault();
        const resistance = 0.5;
        const pull = Math.min(diff * resistance, maxPull);
        setPullDistance(pull);
        
        // Trigger haptic when crossing threshold
        if (pull >= threshold && !hasTriggeredThresholdHaptic.current) {
          hasTriggeredThresholdHaptic.current = true;
          triggerHaptic("threshold");
        } else if (pull < threshold && hasTriggeredThresholdHaptic.current) {
          // Reset if user pulls back below threshold
          hasTriggeredThresholdHaptic.current = false;
        }
      }
    },
    [isRefreshing, maxPull, threshold, triggerHaptic]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      triggerHaptic("start");
      try {
        await onRefresh();
        triggerHaptic("complete");
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
    hasTriggeredThresholdHaptic.current = false;
  }, [pullDistance, threshold, isRefreshing, onRefresh, triggerHaptic]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldRefresh = pullDistance >= threshold;

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    shouldRefresh,
  };
}
