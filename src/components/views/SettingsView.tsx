import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, Palette, LogOut, Languages, AlertCircle, ChevronRight, Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ProfileEditor } from "@/components/ProfileEditor";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useHaptics } from "@/hooks/useHaptics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/nativeToast";
import { useTheme } from "next-themes";

export function SettingsView() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, getDisplayName, getAvatarUrl } = useProfile();
  const { isSupported, isSubscribed, permission, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { theme, setTheme } = useTheme();
  const haptics = useHaptics();
  const navigate = useNavigate();
  const [preferredLanguage, setPreferredLanguage] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

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

  const displayName = getDisplayName();
  const avatarUrl = getAvatarUrl();
  const userEmail = user?.email || "Not signed in";

  const handleSettingTap = (label: string) => {
    haptics.selection();
    
    switch (label) {
      case "Profile":
        setShowProfileEditor(true);
        break;
      case "Appearance":
        // Toggle theme
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        toast.success(newTheme === "dark" ? "Dark mode" : "Light mode");
        break;
      case "Privacy Policy":
        navigate("/privacy");
        break;
    }
  };

  const settingsSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile", description: "Manage your account details" },
        { icon: Shield, label: "Privacy Policy", description: "How we handle your data" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { 
          icon: theme === "dark" ? Moon : Sun, 
          label: "Appearance", 
          description: theme === "dark" ? "Dark mode enabled" : "Light mode enabled"
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 pb-36">
      {/* Header */}
      <PageHeader 
        title="Settings" 
        subtitle="Customize your ThoughtSpark experience"
      />

      {/* Display Name Prompt */}
      {user && displayName === "User" && (
        <div 
          className="glass-card rounded-2xl p-4 mb-6 border border-primary/30 bg-primary/5 animate-fade-in cursor-pointer hover:bg-primary/10 transition-colors"
          style={{ animationDelay: "75ms" }}
          onClick={() => setShowProfileEditor(true)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Complete your profile</p>
              <p className="text-sm text-muted-foreground">
                Add a display name so others can identify you when you share memos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="glass-card rounded-2xl p-6 mb-10 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName}
              className="w-16 h-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-display font-semibold text-lg text-foreground">{displayName}</h3>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
          <Button variant="soft" size="sm" onClick={() => setShowProfileEditor(true)}>
            Edit
          </Button>
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

      {/* Settings Sections */}
      <div className="space-y-10">
        {settingsSections.map((section, sectionIndex) => (
          <div 
            key={section.title}
            className="animate-fade-in"
            style={{ animationDelay: `${150 + sectionIndex * 50}ms` }}
          >
            <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              {section.title}
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleSettingTap(item.label)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      {user && (
        <div className="mt-12 animate-fade-in" style={{ animationDelay: "350ms" }}>
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
            avatar_url: profile?.avatar_url || null,
            bio: profile?.bio || null,
          }}
          onProfileUpdate={(updated) => {
            updateProfile(updated);
          }}
        />
      )}
    </div>
  );
}
