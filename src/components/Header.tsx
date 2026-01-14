import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm pt-safe">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {/* Global Search Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className="h-10 w-10 rounded-full hover:bg-muted"
            >
              <Search className="h-5 w-5" />
            </Button>
            
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

      {/* Global Search Modal */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}
