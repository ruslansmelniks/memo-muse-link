import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm pt-safe">
        <div className="container mx-auto px-4 py-1">
          <div className="flex items-center justify-end gap-2">
            {!user && (
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
