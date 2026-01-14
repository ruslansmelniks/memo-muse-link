import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface HeaderProps {
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export function Header({ 
  showSearch = false, 
  searchQuery = "", 
  onSearchChange,
  searchPlaceholder = "Search..."
}: HeaderProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user } = useAuth();

  const handleSearchToggle = () => {
    if (isSearchOpen && searchQuery) {
      onSearchChange?.("");
    }
    setIsSearchOpen(!isSearchOpen);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm pt-safe">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {/* Search */}
            {showSearch && (
              <div className={cn(
                "flex items-center transition-all duration-300",
                isSearchOpen ? "flex-1" : ""
              )}>
                {isSearchOpen ? (
                  <div className="relative flex-1 mr-2 animate-fade-in">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                      placeholder={searchPlaceholder}
                      autoFocus
                      className="w-full pl-9 pr-9 py-2 rounded-full bg-muted border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => onSearchChange?.("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSearchToggle}
                  className={cn(
                    "h-10 w-10 rounded-full",
                    isSearchOpen && "bg-muted"
                  )}
                >
                  {isSearchOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>
            )}
            
            {user ? (
              <NotificationBell />
            ) : (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-foreground hover:bg-foreground/5 min-h-[44px] px-4"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}
