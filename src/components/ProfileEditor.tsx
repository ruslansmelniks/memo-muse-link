import { useEffect, useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/nativeToast";

interface Profile {
  display_name: string | null;
}

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentProfile: Profile;
  onProfileUpdate: (profile: Profile) => void;
}

export function ProfileEditor({ 
  isOpen, 
  onClose, 
  userId, 
  currentProfile, 
  onProfileUpdate 
}: ProfileEditorProps) {
  const [displayName, setDisplayName] = useState(currentProfile.display_name || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setDisplayName(currentProfile.display_name || "");
  }, [isOpen, currentProfile.display_name]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      onProfileUpdate({
        display_name: displayName.trim(),
      });
      toast.success("Profile updated");
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="rounded-t-3xl native-sheet h-[85vh] max-h-[85vh] flex flex-col">
        <div className="relative">
          <DrawerHeader className="px-6 pt-6 pb-2 text-left">
            <DrawerTitle>Edit Profile</DrawerTitle>
            <DrawerDescription>Update your display name</DrawerDescription>
          </DrawerHeader>

          {/* Larger close button (top-right) */}
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute right-4 top-4 h-11 w-11 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
            >
              <X className="h-6 w-6" />
            </button>
          </DrawerClose>
        </div>

        <div className="px-6 pb-4 overflow-y-auto flex-1 overscroll-contain">
          <div className="space-y-6 py-4">
          {/* Display Name */}
            <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              This is how others will see you on shared memos
            </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pt-2 native-sheet-actions">
          <div className="flex gap-3">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1" disabled={isSaving}>
                Cancel
              </Button>
            </DrawerClose>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
