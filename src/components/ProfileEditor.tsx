import { useState, useRef } from "react";
import { Camera, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  username?: string | null;
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
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatar_url || "");
  const [bio, setBio] = useState(currentProfile.bio || "");
  const [username, setUsername] = useState(currentProfile.username || "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      // Create a unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache-busting query param
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithCacheBust);
      toast.success("Avatar uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const validateUsername = (value: string): string | null => {
    if (!value) return null; // Empty is OK
    if (value.length < 3) return "Username must be at least 3 characters";
    if (value.length > 20) return "Username must be 20 characters or less";
    if (!/^[a-z0-9_]+$/.test(value)) return "Only lowercase letters, numbers, and underscores";
    return null;
  };

  const handleUsernameChange = async (value: string) => {
    const lowercased = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(lowercased);
    
    const error = validateUsername(lowercased);
    if (error) {
      setUsernameError(error);
      return;
    }

    if (lowercased === currentProfile.username) {
      setUsernameError(null);
      return;
    }

    // Check if username is taken
    if (lowercased.length >= 3) {
      setIsCheckingUsername(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", lowercased)
          .neq("user_id", userId)
          .maybeSingle();

        if (data) {
          setUsernameError("Username is already taken");
        } else {
          setUsernameError(null);
        }
      } catch {
        // Ignore errors during check
      } finally {
        setIsCheckingUsername(false);
      }
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    if (usernameError) {
      toast.error(usernameError);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl || null,
          bio: bio.trim() || null,
          username: username.trim() || null,
        })
        .eq("user_id", userId);

      if (error) throw error;

      onProfileUpdate({
        display_name: displayName.trim(),
        avatar_url: avatarUrl || null,
        bio: bio.trim() || null,
        username: username.trim() || null,
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

  const getInitial = () => {
    if (displayName.trim()) return displayName.trim()[0].toUpperCase();
    return "?";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Customize your display name and avatar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-lg">
                  {getInitial()}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            {avatarUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAvatarUrl("")}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Remove photo
              </Button>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="username"
                maxLength={20}
                className="pl-7"
              />
            </div>
            {usernameError ? (
              <p className="text-xs text-destructive">{usernameError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Unique handle for others to find you (3-20 characters)
              </p>
            )}
          </div>

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

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              maxLength={160}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/160 characters
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading || isCheckingUsername || !!usernameError}>
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
      </DialogContent>
    </Dialog>
  );
}
