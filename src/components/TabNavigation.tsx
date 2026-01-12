import { Mic, Compass, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "record", icon: Mic, label: "Record" },
  { id: "discover", icon: Compass, label: "Discover" },
  { id: "library", icon: FolderOpen, label: "Library" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/30 pb-safe">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  isActive && "bg-foreground/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive && "stroke-[2.5]"
                  )} />
                </div>
                <span className={cn(
                  "text-xs",
                  isActive ? "font-medium" : "font-normal"
                )}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
