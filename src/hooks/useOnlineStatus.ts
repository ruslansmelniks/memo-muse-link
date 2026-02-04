import { useState, useEffect, useCallback } from "react";

interface OnlineStatusState {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useOnlineStatus() {
  const [state, setState] = useState<OnlineStatusState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
  });

  const handleOnline = useCallback(() => {
    setState((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline, // was offline before this event
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setState({
      isOnline: false,
      wasOffline: false,
    });
  }, []);

  // Clear the "wasOffline" flag after showing reconnection message
  const clearWasOffline = useCallback(() => {
    setState((prev) => ({ ...prev, wasOffline: false }));
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline: state.isOnline,
    wasOffline: state.wasOffline,
    clearWasOffline,
  };
}
