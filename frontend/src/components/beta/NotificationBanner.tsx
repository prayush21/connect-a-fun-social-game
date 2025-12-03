"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationStore } from "@/lib/beta/notification-store";
import { NotificationStyles } from "@/lib/beta/notifications";
import type { GameNotification } from "@/lib/beta/notifications";

interface NotificationBannerProps {
  /** Maximum number of notifications to show */
  maxVisible?: number;
  /** Additional class names */
  className?: string;
}

/**
 * NotificationBanner Component
 *
 * Displays game notifications in a toast-like banner.
 * Designed to fit in the header notification area of the play page.
 *
 * Notifications stack vertically and animate smoothly as they appear/disappear.
 * Uses layout animations to smoothly reposition remaining notifications when one is dismissed.
 */
export function NotificationBanner({
  maxVisible = 5,
  className = "",
}: NotificationBannerProps) {
  const notifications = useNotificationStore((state) => state.notifications);
  const dismissNotification = useNotificationStore(
    (state) => state.dismissNotification
  );

  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={() => dismissNotification(notification.id)}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface NotificationItemProps {
  notification: GameNotification;
  onDismiss: () => void;
  index?: number;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const styles = NotificationStyles[notification.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
        layout: { type: "spring", stiffness: 500, damping: 30 },
      }}
      className="pointer-events-auto"
    >
      <div
        className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-medium shadow-lg ${styles.bgColor} ${styles.borderColor} ${styles.textColor}`}
      >
        {styles.icon && <span className="text-sm">{styles.icon}</span>}
        <span className="max-w-[200px] truncate">{notification.message}</span>
        <button
          onClick={onDismiss}
          className="ml-1 flex h-4 w-4 items-center justify-center rounded-full opacity-60 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Simple hook-based notification trigger for user actions
 * This provides a simpler API for components that just need to show feedback
 */
export function useNotify() {
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  return {
    /**
     * Show a success notification
     */
    success: (message: string) => {
      addNotification({
        category: "success",
        priority: "normal",
        message,
        autoDismissMs: 3000,
        isFromCurrentUser: true,
      });
    },

    /**
     * Show an error notification
     */
    error: (message: string) => {
      addNotification({
        category: "error",
        priority: "high",
        message,
        autoDismissMs: 4000,
        isFromCurrentUser: true,
      });
    },

    /**
     * Show an info notification
     */
    info: (message: string) => {
      addNotification({
        category: "info",
        priority: "normal",
        message,
        autoDismissMs: 3000,
        isFromCurrentUser: true,
      });
    },

    /**
     * Show a signull-related notification
     */
    signull: (message: string) => {
      addNotification({
        category: "signull",
        priority: "normal",
        message,
        autoDismissMs: 3000,
        isFromCurrentUser: true,
      });
    },
  };
}
