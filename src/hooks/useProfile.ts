import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferred_language: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, bio, preferred_language")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading profile:", error);
    }

    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const getDisplayName = useCallback(() => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  }, [profile, user]);

  const getAvatarUrl = useCallback(() => {
    return profile?.avatar_url || null;
  }, [profile]);

  return {
    profile,
    loading,
    loadProfile,
    updateProfile,
    getDisplayName,
    getAvatarUrl,
  };
}
