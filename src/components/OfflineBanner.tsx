import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show "Back online" message briefly when reconnecting
  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        clearWasOffline();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline, clearWasOffline]);

  const showBanner = !isOnline || showReconnected;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-area-top"
        >
          <div
            className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium ${
              isOnline
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-amber-950"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Back online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>You're offline. Some features may be limited.</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
