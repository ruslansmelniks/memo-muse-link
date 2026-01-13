import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "discover-autoplay-enabled";

export function useAutoPlay() {
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === "true" : true; // Default to enabled
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(autoPlayEnabled));
  }, [autoPlayEnabled]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlayEnabled(prev => !prev);
  }, []);

  return {
    autoPlayEnabled,
    setAutoPlayEnabled,
    toggleAutoPlay,
  };
}
