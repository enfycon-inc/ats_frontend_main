"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { useSocket } from './SocketContext';
import { playPresetSound, type SoundPreset } from '@/lib/audio-synthesizer';
import { atsApi } from '@/lib/ats-api';
import { DEFAULT_NOTIFICATION_PREFERENCES, activityEnabled, type NotificationPreferences } from '@/lib/notification-preferences';
export interface NotificationItem {
  id: string; type: string; title: string; message: string; data?: any; isRead: boolean;
  initiatorId?: string; initiatorName?: string; initiatorEmail?: string; createdAt: string; timestamp?: string;
}
export type NotificationSettings = NotificationPreferences;
interface NotificationContextType {
  notifications: NotificationItem[]; unreadCount: number; isLoading: boolean; settings: NotificationSettings;
  settingsLoading: boolean; settingsError: boolean;
  setSoundPreset: (preset: SoundPreset) => void; setSoundEnabled: (enabled: boolean) => void; setToastEnabled: (enabled: boolean) => void;
  updateSettings: (input: Partial<NotificationSettings>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>; markAllAsRead: () => Promise<void>; refreshNotifications: () => Promise<void>;
}
const NotificationContext = createContext<NotificationContextType>({
  notifications: [], unreadCount: 0, isLoading: false, settings: DEFAULT_NOTIFICATION_PREFERENCES, settingsLoading: true, settingsError: false,
  setSoundPreset: () => {}, setSoundEnabled: () => {}, setToastEnabled: () => {}, updateSettings: async () => {}, markAsRead: async () => {}, markAllAsRead: async () => {}, refreshNotifications: async () => {},
});
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user as { id?: string; tenantId?: string; email?: string } | undefined;
  const identity = status === 'authenticated' && user?.id && user?.tenantId ? `${user.id}:${user.tenantId}` : null;
  const { socket, isConnected } = useSocket();
  const profile = useSWR<NotificationSettings>(identity ? ['notification-settings', identity] : null,
    () => atsApi.fetch('/api/notifications/settings'), { revalidateOnFocus: true, revalidateOnReconnect: true, refreshInterval: 30000 });
  const settings = profile.data || DEFAULT_NOTIFICATION_PREFERENCES;
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const confirmedRef = useRef(false); confirmedRef.current = !!profile.data && !profile.error;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const seen = useRef(new Set<string>());
  const baselineLoaded = useRef(false);
  const generation = useRef(0);
  const updateQueue = useRef(Promise.resolve());
  useEffect(() => {
    generation.current++; seen.current.clear(); baselineLoaded.current = false;
    setNotifications([]); setUnreadCount(0);
  }, [identity]);
  const announce = useCallback((notification: NotificationItem) => {
    if (!confirmedRef.current || !activityEnabled(notification.type, settingsRef.current)) return;
    const initiator = notification.initiatorId?.toLowerCase();
    if (initiator && [user?.id?.toLowerCase(), user?.email?.toLowerCase()].includes(initiator)) return;
    if (settingsRef.current.soundEnabled && settingsRef.current.soundPreset !== 'MUTE') playPresetSound(settingsRef.current.soundPreset, 0.6);
    window.dispatchEvent(new CustomEvent('atsNotificationReceived', { detail: notification }));
  }, [user?.id, user?.email]);
  const fetchNotifications = useCallback(async (notify = false) => {
    if (!identity) return;
    const currentGeneration = generation.current;
    setIsLoading(true);
    try {
      const result = await atsApi.fetch<{ data: NotificationItem[]; unreadCount: number }>('/api/notifications?page=1&limit=30');
      if (currentGeneration !== generation.current) return;
      const list = result.data || [];
      const newItems = list.filter(item => !seen.current.has(item.id));
      for (const item of list) seen.current.add(item.id);
      setNotifications(list); setUnreadCount(result.unreadCount || 0);
      if (notify && baselineLoaded.current) for (const item of newItems.slice().reverse()) announce(item);
      baselineLoaded.current = true;
    } finally { if (currentGeneration === generation.current) setIsLoading(false); }
  }, [identity, announce]);
  useEffect(() => { void fetchNotifications().catch(() => {}); }, [fetchNotifications]);
  useEffect(() => {
    if (!identity) return;
    const focus = () => { void fetchNotifications().catch(() => {}); };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [identity, fetchNotifications]);
  useEffect(() => {
    if (!identity || !socket || !isConnected) return;
    const incoming = (notification: NotificationItem) => {
      if (seen.current.has(notification.id)) return;
      seen.current.add(notification.id);
      setNotifications(items => [notification, ...items].slice(0, 30));
      if (!notification.isRead) setUnreadCount(count => count + 1);
      announce(notification);
    };
    // Private role notifications carry no sensitive data on the socket. Fetch
    // the authorized records, then use the same preference-aware presentation.
    const changed = () => { void fetchNotifications(true).catch(() => {}); };
    socket.on('notification', incoming); socket.on('notifications_changed', changed);
    return () => { socket.off('notification', incoming); socket.off('notifications_changed', changed); };
  }, [identity, socket, isConnected, announce, fetchNotifications]);
  const updateSettings = async (input: Partial<NotificationSettings>) => {
    if (!identity || !profile.data) throw new Error('Load your notification settings before saving.');
    const currentGeneration = generation.current;
    const save = async () => {
      if (currentGeneration !== generation.current) throw new Error('Your signed-in account changed.');
      const saved = await atsApi.fetch<NotificationSettings>('/api/notifications/settings', { method: 'PUT', body: JSON.stringify(input) });
      if (currentGeneration === generation.current) await profile.mutate(saved, false);
    };
    const pending = updateQueue.current.then(save, save);
    updateQueue.current = pending.catch(() => {});
    await pending;
  };
  const quickSave = (input: Partial<NotificationSettings>) => { void updateSettings(input).catch(() => toast.error('Could not save notification preferences.')); };
  const markAsRead = async (id: string) => {
    await atsApi.fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    await fetchNotifications();
  };
  const markAllAsRead = async () => { await atsApi.fetch('/api/notifications/read-all', { method: 'PATCH' }); await fetchNotifications(); };
  return <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, settings,
    settingsLoading: status === 'loading' || !profile.data, settingsError: !!profile.error,
    setSoundPreset: soundPreset => quickSave({ soundPreset }), setSoundEnabled: soundEnabled => quickSave({ soundEnabled }), setToastEnabled: toastEnabled => quickSave({ toastEnabled }),
    updateSettings, markAsRead, markAllAsRead, refreshNotifications: () => fetchNotifications() }}>{children}</NotificationContext.Provider>;
}
export const useNotifications = () => useContext(NotificationContext);
