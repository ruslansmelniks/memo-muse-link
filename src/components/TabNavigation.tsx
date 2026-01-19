import { motion } from "framer-motion";
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

export function TabNavigation({ activeTab, onTabChange, inboxUnreadCount = 0 }: TabNavigationProps) {
  const haptics = useHaptics();

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTab) {
      haptics.selection();
    }
    onTabChange(tabId);
  };

  return (
    // iOS Tab Bar: 49pt height + safe area, translucent blur background
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/30 pb-safe z-50">
      <div className="h-[49px] flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'inbox' && inboxUnreadCount > 0;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.1 }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-150",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground/70"
              )}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "transition-all duration-150",
                    isActive ? "stroke-[2]" : "stroke-[1.5]"
                  )}
                  // iOS icon size: 25pt (approximately 25px)
                  size={25}
                />
                
                {/* iOS-style unread badge */}
                {showBadge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <span className="text-[11px] font-semibold text-destructive-foreground leading-none">
                      {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                    </span>
                  </motion.div>
                )}
              </div>
              
              {/* iOS label: SF Pro Text 10pt medium */}
              <span className={cn(
                "text-[10px] leading-tight tracking-tight",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
