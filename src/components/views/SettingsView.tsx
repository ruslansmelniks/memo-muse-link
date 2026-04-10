import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, LogOut, Languages, ChevronRight, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ProfileEditor } from "@/components/ProfileEditor";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useHaptics } from "@/hooks/useHaptics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/nativeToast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SettingsView() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, getDisplayName } = useProfile();
  const { isSupported, isSubscribed, permission, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const haptics = useHaptics();
  const navigate = useNavigate();
  const [preferredLanguage, setPreferredLanguage] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (profile?.preferred_language) {
      setPreferredLanguage(profile.preferred_language);
    }
  }, [profile]);

  const handleLanguageChange = async (code: string) => {
    if (!user) {
      setPreferredLanguage(code);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_language: code })
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferredLanguage(code);
      toast.success("Language preference saved");
    } catch (error) {
      console.error("Error saving language preference:", error);
      toast.error("Failed to save preference");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribe();
      if (success) {
        toast.success("Push notifications enabled");
      } else if (permission === "denied") {
        toast.error("Please enable notifications in your browser settings");
      } else {
        toast.error("Failed to enable push notifications");
      }
    } else {
      const success = await unsubscribe();
      if (success) {
        toast.success("Push notifications disabled");
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const userEmail = user?.email || "Not signed in";
  const hasDisplayName = Boolean(profile?.display_name && profile.display_name.trim().length > 0);
  const displayName = hasDisplayName ? (profile?.display_name || "").trim() : "";

  const handleSettingTap = (label: string) => {
    haptics.selection();
    
    switch (label) {
      case "Profile":
        setShowProfileEditor(true);
        break;
      case "Privacy Policy":
        navigate("/app/privacy");
        break;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-36">
      {/* Header */}
      <PageHeader 
        title="Settings" 
        subtitle="Customize your ThoughtSpark experience"
      />

      {/* Profile Card */}
      <div className="glass-card rounded-2xl p-6 mb-10 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {hasDisplayName ? (
              <>
                <h3 className="font-display font-semibold text-lg text-foreground">{displayName}</h3>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            )}
          </div>
        </div>
      </div>

      {/* Language Preference */}
      <div className="animate-fade-in mb-10" style={{ animationDelay: "125ms" }}>
        <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
          Language
        </h3>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Languages className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Recording Language</p>
              <p className="text-sm text-muted-foreground">Default language for speech recognition</p>
            </div>
            <LanguageSelector
              selectedLanguage={preferredLanguage}
              onLanguageChange={handleLanguageChange}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      {user && isSupported && (
        <div className="animate-fade-in mb-10" style={{ animationDelay: "130ms" }}>
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            Notifications
          </h3>
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {permission === "denied" 
                    ? "Blocked in browser settings" 
                    : "Get alerts when someone follows or likes"}
                </p>
              </div>
              <Switch 
                checked={isSubscribed} 
                onCheckedChange={handlePushToggle}
                disabled={pushLoading || permission === "denied"}
              />
            </div>
          </div>
        </div>
      )}

      {/* Account */}
      <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
        <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
          Account
        </h3>

        <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border">
          <button
            onClick={() => handleSettingTap("Profile")}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Profile</p>
              <p className="text-sm text-muted-foreground">Change your display name</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </button>

          <button
            onClick={() => handleSettingTap("Privacy Policy")}
            className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Privacy Policy</p>
              <p className="text-sm text-muted-foreground">How we handle your data</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </button>

          {user && (
            <AlertDialog
              onOpenChange={(open) => {
                if (!open) {
                  setDeleteConfirmText("");
                  setIsDeletingAccount(false);
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-4 p-4 hover:bg-destructive/10 active:bg-destructive/15 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your data and account</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete your account? This will permanently delete all your data including memos,
                    transcriptions, and profile information. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2">
                  <p className="text-sm text-foreground">
                    Type <span className="font-mono font-semibold">DELETE</span> to confirm.
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeletingAccount || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!user) return;
                      if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;

                      setIsDeletingAccount(true);
                      try {
                        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
                        if (sessionErr) throw sessionErr;
                        const token = sessionData.session?.access_token;
                        if (!token) throw new Error("Not signed in");

                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
                        if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL");
                        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
                        if (!supabaseAnonKey) throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY");

                        const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
                          method: "POST",
                          headers: {
                            apikey: supabaseAnonKey,
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                          },
                        });

                        if (!res.ok) {
                          let detail = "";
                          try {
                            const json = await res.json();
                            detail = json?.error ? String(json.error) : JSON.stringify(json);
                          } catch {
                            try {
                              detail = await res.text();
                            } catch {
                              detail = "";
                            }
                          }
                          const msg =
                            res.status === 404
                              ? "Delete Account isn't deployed on Supabase yet."
                              : `Delete failed (${res.status}). ${detail || ""}`.trim();
                          throw new Error(msg);
                        }

                        await signOut();
                        toast.success("Account deleted");
                        navigate("/app");
                      } catch (err) {
                        console.error("Delete account error:", err);
                        toast.error(err instanceof Error ? err.message : "Failed to delete account. Please try again.");
                      } finally {
                        setIsDeletingAccount(false);
                      }
                    }}
                  >
                    {isDeletingAccount ? "Deleting…" : "Delete My Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Logout */}
      {user && (
        <div className="mt-4 animate-fade-in" style={{ animationDelay: "350ms" }}>
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      )}

      {/* Profile Editor Modal */}
      {user && (
        <ProfileEditor
          isOpen={showProfileEditor}
          onClose={() => setShowProfileEditor(false)}
          userId={user.id}
          currentProfile={{
            display_name: profile?.display_name || null,
          }}
          onProfileUpdate={(updated) => {
            updateProfile(updated);
          }}
        />
      )}
    </div>
  );
}
