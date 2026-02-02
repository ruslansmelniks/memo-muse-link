import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Compass, Inbox, FolderOpen, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  inboxUnreadCount?: number;
}

const allTabs = [
  { id: "record", icon: Mic, label: "Record" },
  { id: "search", icon: Search, label: "Search" },
  { id: "discover", icon: Compass, label: "Discover" },
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "library", icon: FolderOpen, label: "Library" },
  { id: "settings", icon: Settings, label: "Settings" },
];

// Filter tabs based on feature flag
const tabs = FEATURE_FLAGS.CORE_FEATURES_ONLY
  ? allTabs.filter(tab => ["record", "search", "library", "settings"].includes(tab.id))
  : allTabs;

// iOS spring animation config
const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

// Subtle iOS-style bounce for active tab
const bounceTransition = {
  type: "spring" as const,
  stiffness: 520,
  damping: 18,
  mass: 0.6,
};

const tapAnimation = {
  scale: 0.92,
};

export function TabNavigation({ activeTab, onTabChange, inboxUnreadCount = 0 }: TabNavigationProps) {
  const haptics = useHaptics();
  const [bouncingTab, setBouncingTab] = useState<string | null>(null);

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTab) {
      haptics.selection();
      // Trigger bounce animation
      setBouncingTab(tabId);
    }
    onTabChange(tabId);
  };

  // Reset bounce state after animation
  useEffect(() => {
    if (bouncingTab) {
      const timer = setTimeout(() => setBouncingTab(null), 400);
      return () => clearTimeout(timer);
    }
  }, [bouncingTab]);

  return (
    // iOS liquid glass tab bar
    <nav className="fixed bottom-0 left-0 right-0 pb-safe z-50 ios-tab-bar">
      
      <div className="h-[49px] flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isBouncing = bouncingTab === tab.id;
          const showBadge = tab.id === 'inbox' && inboxUnreadCount > 0;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              whileTap={tapAnimation}
              transition={springConfig}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative",
                "focus:outline-none focus-visible:outline-none"
              )}
              type="button"
              aria-label={tab.label}
            >
              <motion.div 
                className="relative"
                animate={{ 
                  scale: isBouncing ? [1, 1.08, 0.98, 1.02, 1] : 1,
                  y: isActive ? -0.5 : 0 
                }}
                transition={isBouncing ? bounceTransition : springConfig}
              >
                <motion.div
                  animate={{ 
                    color: isActive ? 'var(--ios-tab-active)' : 'var(--ios-tab-inactive)'
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon 
                    className={cn(
                      "transition-all duration-150",
                      isActive ? "stroke-[2.2]" : "stroke-[1.5]"
                    )}
                    size={25}
                  />
                </motion.div>
                
                {/* iOS-style unread badge with bounce animation */}
                <AnimatePresence>
                  {showBadge && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 20,
                      }}
                      className="absolute -top-1 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3B30] flex items-center justify-center shadow-sm"
                    >
                      <span className="text-[11px] font-semibold text-white leading-none">
                        {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {/* iOS label with color animation */}
              <motion.span 
                className={cn(
                  "text-[10px] leading-tight tracking-tight",
                  isActive ? "font-semibold" : "font-medium"
                )}
                animate={{ 
                  color: isActive ? 'var(--ios-tab-active)' : 'var(--ios-tab-inactive)'
                }}
                transition={{ duration: 0.2 }}
              >
                {tab.label}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
