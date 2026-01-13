import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  type: "follow" | "like";
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
  memoId: string | null;
  memoTitle: string | null;
  read: boolean;
  createdAt: Date;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, actor_id, memo_id, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Get actor profiles
    const actorIds = [...new Set(data.map((n) => n.actor_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", actorIds);

    const profileMap = new Map(
      profiles?.map((p) => [
        p.user_id,
        { name: p.display_name || "Someone", avatar: p.avatar_url },
      ]) || []
    );

    // Get memo titles for like notifications
    const memoIds = data
      .filter((n) => n.memo_id)
      .map((n) => n.memo_id as string);
    
    let memoMap = new Map<string, string>();
    if (memoIds.length > 0) {
      const { data: memos } = await supabase
        .from("memos")
        .select("id, title")
        .in("id", memoIds);
      memoMap = new Map(memos?.map((m) => [m.id, m.title]) || []);
    }

    const mappedNotifications: Notification[] = data.map((n) => ({
      id: n.id,
      type: n.type as "follow" | "like",
      actorId: n.actor_id,
      actorName: profileMap.get(n.actor_id)?.name || "Someone",
      actorAvatar: profileMap.get(n.actor_id)?.avatar || null,
      memoId: n.memo_id,
      memoTitle: n.memo_id ? memoMap.get(n.memo_id) || "a memo" : null,
      read: n.read,
      createdAt: new Date(n.created_at),
    }));

    setNotifications(mappedNotifications);
    setUnreadCount(mappedNotifications.filter((n) => !n.read).length);
    setLoading(false);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [user]);

  const clearNotification = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setUnreadCount((prev) => {
          const wasUnread = notifications.find(
            (n) => n.id === notificationId && !n.read
          );
          return wasUnread ? Math.max(0, prev - 1) : prev;
        });
      }
    },
    [user, notifications]
  );

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refresh: fetchNotifications,
  };
}
