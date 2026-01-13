import { useState, useRef, useEffect } from "react";
import { Bell, Heart, UserPlus, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { user } = useAuth();
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-card border border-border rounded-2xl shadow-lg overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto max-h-[calc(70vh-52px)]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={() => markAsRead(notification.id)}
                      onClear={() => clearNotification(notification.id)}
                      formatTimeAgo={formatTimeAgo}
                      onClose={() => setIsOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onClear: () => void;
  formatTimeAgo: (date: Date) => string;
  onClose: () => void;
}

function NotificationItem({
  notification,
  onRead,
  onClear,
  formatTimeAgo,
  onClose,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }
    onClose();
  };

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors relative group",
        !notification.read && "bg-primary/5"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {notification.actorAvatar ? (
          <img
            src={notification.actorAvatar}
            alt={notification.actorName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-medium text-sm">
            {notification.actorName.charAt(0).toUpperCase()}
          </div>
        )}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
            notification.type === "follow"
              ? "bg-primary text-primary-foreground"
              : "bg-red-500 text-white"
          )}
        >
          {notification.type === "follow" ? (
            <UserPlus className="h-3 w-3" />
          ) : (
            <Heart className="h-3 w-3" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{notification.actorName}</span>{" "}
          {notification.type === "follow" ? (
            "started following you"
          ) : (
            <>
              liked your memo{" "}
              <span className="font-medium">{notification.memoTitle}</span>
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}

      {/* Clear button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClear();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );

  if (notification.type === "follow") {
    return (
      <Link to={`/profile/${notification.actorId}`} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  if (notification.type === "like" && notification.memoId) {
    return (
      <Link to={`/memo/${notification.memoId}`} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return <div onClick={handleClick}>{content}</div>;
}
