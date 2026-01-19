import { motion, AnimatePresence } from "framer-motion";
import { Mic, Compass, Inbox, FolderOpen, Settings } from "lucide-react";
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
  { id: "discover", icon: Compass, label: "Discover" },
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "library", icon: FolderOpen, label: "Library" },
  { id: "settings", icon: Settings, label: "Settings" },
];

// Filter tabs based on feature flag
const tabs = FEATURE_FLAGS.CORE_FEATURES_ONLY
  ? allTabs.filter(tab => ["record", "library", "settings"].includes(tab.id))
  : allTabs;

// iOS spring animation config
const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

const tapAnimation = {
  scale: 0.85,
};

export function TabNavigation({ activeTab, onTabChange, inboxUnreadCount = 0 }: TabNavigationProps) {
  const haptics = useHaptics();

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTab) {
      haptics.selection();
    }
    onTabChange(tabId);
  };

  return (
    // iOS Tab Bar with frosted glass effect
    <nav 
      className="fixed bottom-0 left-0 right-0 pb-safe z-50"
      style={{
        // iOS-style frosted glass
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
    >
      {/* iOS hairline separator */}
      <div 
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'rgba(0, 0, 0, 0.12)',
        }}
      />
      
      <div className="h-[49px] flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
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
            >
              <motion.div 
                className="relative"
                animate={{ 
                  scale: isActive ? 1 : 1,
                  y: isActive ? -1 : 0 
                }}
                transition={springConfig}
              >
                <motion.div
                  animate={{ 
                    color: isActive ? 'hsl(var(--primary))' : 'rgba(142, 142, 147, 1)'
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
                  color: isActive ? 'hsl(var(--primary))' : 'rgba(142, 142, 147, 1)'
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
