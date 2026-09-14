"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "./SocketContext";
import { SoundPreset, playPresetSound } from "@/lib/audio-synthesizer";
import { isJwtExpired } from "@/lib/ats-api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  initiatorId?: string;
  initiatorName?: string;
  initiatorEmail?: string;
  createdAt: string;
  timestamp?: string;
}

export interface NotificationSettings {
  soundEnabled: boolean;
  soundPreset: SoundPreset;
  toastEnabled: boolean;
  jobAlerts: boolean;
  reviewAlerts: boolean;
  submissionAlerts: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  settings: NotificationSettings;
  setSoundPreset: (preset: SoundPreset) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setToastEnabled: (enabled: boolean) => void;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundPreset: "CLASSIC_CHIME",
  toastEnabled: true,
  jobAlerts: true,
  reviewAlerts: true,
  submissionAlerts: true,
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  settings: DEFAULT_SETTINGS,
  setSoundPreset: () => {},
  setSoundEnabled: () => {},
  setToastEnabled: () => {},
  updateSettings: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshNotifications: async () => {},
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const local = localStorage.getItem("ats_access_token");
      if (local && !isJwtExpired(local)) return local;
    }
    return null;
  });

  useEffect(() => {
    const sessionToken = (session as any)?.accessToken || (session as any)?.user?.accessToken || (session as any)?.token;
    if (sessionToken) {
      setToken(sessionToken);
    } else if (typeof window !== "undefined") {
      const localToken = localStorage.getItem("ats_access_token");
      if (localToken) setToken(localToken);
    }
  }, [session]);

  const { socket, isConnected } = useSocket();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("ats_notification_settings");
        if (local) return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
      } catch (e) {
        console.warn("Failed to load local notification settings:", e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Fetch paginated user notifications
  const fetchNotifications = useCallback(async () => {
    let activeToken = token;
    if ((!activeToken || isJwtExpired(activeToken)) && typeof window !== "undefined") {
      activeToken = localStorage.getItem("ats_access_token");
    }
    if (!activeToken || isJwtExpired(activeToken)) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/api/notifications?page=1&limit=30`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const result = await res.json();
        setNotifications(result.data || []);
        setUnreadCount(result.unreadCount ?? 0);
      }
    } catch (err) {
      console.warn("[NotificationContext] Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token, apiUrl]);

  // Fetch user settings from server
  const fetchSettings = useCallback(async () => {
    let activeToken = token;
    if ((!activeToken || isJwtExpired(activeToken)) && typeof window !== "undefined") {
      activeToken = localStorage.getItem("ats_access_token");
    }
    if (!activeToken || isJwtExpired(activeToken)) return;
    try {
      const res = await fetch(`${apiUrl}/api/notifications/settings`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const serverSettings = await res.json();
        if (serverSettings) {
          const merged = { ...DEFAULT_SETTINGS, ...serverSettings };
          setSettings(merged);
          if (typeof window !== "undefined") {
            localStorage.setItem("ats_notification_settings", JSON.stringify(merged));
          }
        }
      }
    } catch (err) {
      console.warn("[NotificationContext] Failed to fetch notification settings:", err);
    }
  }, [token, apiUrl]);

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, [token, fetchNotifications, fetchSettings]);

  // Refetch when window regains focus
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchNotifications]);

  // Listen to incoming live real-time notifications via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleIncomingNotification = (newNotif: NotificationItem) => {
      console.log("[NotificationContext] Real-time notification received:", newNotif);

      setNotifications((prev) => {
        // Prevent duplicate IDs
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });

      setUnreadCount((prev) => prev + 1);

      // Play custom user notification chime if sound is enabled
      if (settings.soundEnabled && settings.soundPreset !== "MUTE") {
        playPresetSound(settings.soundPreset, 0.6);
      }
    };

    socket.on("notification", handleIncomingNotification);

    return () => {
      socket.off("notification", handleIncomingNotification);
    };
  }, [socket, isConnected, settings.soundEnabled, settings.soundPreset]);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (!token) return;
    try {
      await fetch(`${apiUrl}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Failed to mark notification as read on server:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    if (!token) return;
    try {
      await fetch(`${apiUrl}/api/notifications/read-all`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Failed to mark all as read on server:", err);
    }
  };

  // Update notification settings
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("ats_notification_settings", JSON.stringify(updated));
    }

    if (!token) return;
    try {
      await fetch(`${apiUrl}/api/notifications/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("Failed to save settings to server:", err);
    }
  };

  const setSoundPreset = (preset: SoundPreset) => {
    updateSettings({ soundPreset: preset });
  };

  const setSoundEnabled = (enabled: boolean) => {
    updateSettings({ soundEnabled: enabled });
  };

  const setToastEnabled = (enabled: boolean) => {
    updateSettings({ toastEnabled: enabled });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        settings,
        setSoundPreset,
        setSoundEnabled,
        setToastEnabled,
        updateSettings,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
