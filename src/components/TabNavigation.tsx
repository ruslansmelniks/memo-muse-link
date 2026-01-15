import { motion } from "framer-motion";
import { Mic, Compass, Inbox, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  inboxUnreadCount?: number;
}

const tabs = [
  { id: "record", icon: Mic, label: "Record" },
  { id: "discover", icon: Compass, label: "Discover" },
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "library", icon: FolderOpen, label: "My Library" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function TabNavigation({ activeTab, onTabChange, inboxUnreadCount = 0 }: TabNavigationProps) {
  const haptics = useHaptics();

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTab) {
      haptics.selection();
    }
    onTabChange(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-md border-t border-border/20 pb-safe">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showBadge = tab.id === 'inbox' && inboxUnreadCount > 0;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[64px] min-h-[52px] py-1.5 rounded-2xl transition-colors duration-200 relative",
                  isActive 
                    ? "text-foreground" 
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <div className="p-2 rounded-xl relative">
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-foreground/10 rounded-xl"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <Icon className={cn(
                    "h-5 w-5 relative z-10",
                    isActive && "stroke-[2.5]"
                  )} />
                  
                  {/* Unread badge */}
                  {showBadge && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary flex items-center justify-center z-20"
                    >
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                      </span>
                    </motion.div>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-medium"
                )}>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
