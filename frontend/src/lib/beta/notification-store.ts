/**
 * Notification Store for Beta Game
 *
 * This Zustand store manages the notification queue and provides
 * methods to add, dismiss, and clear notifications.
 *
 * It also handles integration with audio/haptic notifications.
 */

import { create } from "zustand";
import type { GameNotification, NotificationCategory } from "./notifications";
import { generateNotificationId } from "./notifications";

interface NotificationState {
  notifications: GameNotification[];
  maxNotifications: number;

  // Actions
  addNotification: (
    notification: Omit<GameNotification, "id" | "timestamp">
  ) => string;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  clearNotificationsByCategory: (category: NotificationCategory) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  maxNotifications: 5, // Max notifications visible at once

  addNotification: (notification) => {
    const id = generateNotificationId();
    const fullNotification: GameNotification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    set((state) => {
      // Add new notification, keeping only the most recent ones
      const updated = [fullNotification, ...state.notifications].slice(
        0,
        state.maxNotifications
      );
      return { notifications: updated };
    });

    // Set up auto-dismiss if configured
    if (notification.autoDismissMs) {
      setTimeout(() => {
        get().dismissNotification(id);
      }, notification.autoDismissMs);
    }

    return id;
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
  },

  clearNotificationsByCategory: (category) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.category !== category),
    }));
  },
}));

/**
 * Hook to get the most recent notification
 */
export const useLatestNotification = () => {
  return useNotificationStore((state) => state.notifications[0] ?? null);
};

/**
 * Hook to get notification count by category
 */
export const useNotificationCount = (category?: NotificationCategory) => {
  return useNotificationStore((state) =>
    category
      ? state.notifications.filter((n) => n.category === category).length
      : state.notifications.length
  );
};
