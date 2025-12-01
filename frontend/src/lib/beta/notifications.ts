/**
 * Centralized Game Notification System
 *
 * This module provides a unified notification system for game events.
 * It handles both:
 * 1. User action feedback (local actions like "You sent a Signull")
 * 2. Game events (from other players/system like "Player X sent a Signull")
 *
 * Design Goals:
 * - Single source of truth for notification logic
 * - Consistent notification types and styling
 * - Easy integration with existing audio/haptic notifications
 * - Support for notification priorities and auto-dismiss
 */

export type NotificationCategory =
  | "signull" // Signull-related events
  | "connect" // Connect/response events
  | "game" // Game state changes (start, end, letter reveal)
  | "player" // Player join/leave
  | "error" // Error messages
  | "success" // Success confirmations
  | "info"; // General info

export type NotificationPriority = "low" | "normal" | "high";

export interface GameNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title?: string; // Optional short title
  message: string; // Main notification text
  timestamp: Date;
  autoDismissMs?: number; // Auto-dismiss after ms (default: 3000)
  isFromCurrentUser?: boolean; // Distinguish self-actions vs others' actions
  metadata?: {
    playerId?: string;
    playerName?: string;
    signullId?: string;
    [key: string]: unknown;
  };
}

// Predefined notification templates for consistent messaging
export const NotificationTemplates = {
  // Signull Events
  SIGNULL_SENT_SELF: (word: string) => ({
    category: "signull" as const,
    priority: "normal" as const,
    message: `Signull sent: ${word}`,
    isFromCurrentUser: true,
  }),
  SIGNULL_SENT_OTHER: (playerName: string) => ({
    category: "signull" as const,
    priority: "normal" as const,
    message: `${playerName} sent a Signull`,
    isFromCurrentUser: false,
  }),
  SIGNULL_RESOLVED: (clueGiverName: string) => ({
    category: "signull" as const,
    priority: "high" as const,
    message: `${clueGiverName}'s Signull resolved!`,
  }),
  SIGNULL_INTERCEPTED: (setterName: string) => ({
    category: "signull" as const,
    priority: "high" as const,
    message: `Signull intercepted by ${setterName}!`,
  }),
  SIGNULL_FAILED: (clueGiverName: string) => ({
    category: "signull" as const,
    priority: "normal" as const,
    message: `${clueGiverName}'s Signull failed`,
  }),

  // Connect Events
  CONNECT_SENT_SELF: (targetName: string) => ({
    category: "connect" as const,
    priority: "normal" as const,
    message: `Response sent to ${targetName}`,
    isFromCurrentUser: true,
  }),
  CONNECT_RECEIVED: (playerName: string) => ({
    category: "connect" as const,
    priority: "normal" as const,
    message: `${playerName} connected`,
    isFromCurrentUser: false,
  }),

  // Game State Events
  GAME_STARTED: () => ({
    category: "game" as const,
    priority: "high" as const,
    message: "Game started!",
  }),
  GAME_ENDED_GUESSERS_WIN: () => ({
    category: "game" as const,
    priority: "high" as const,
    message: "Guessers win! 🎉",
  }),
  GAME_ENDED_SETTER_WINS: () => ({
    category: "game" as const,
    priority: "high" as const,
    message: "Setter wins! 🎉",
  }),
  LETTER_REVEALED: (letter: string, position: number) => ({
    category: "game" as const,
    priority: "high" as const,
    message: `Letter ${position + 1} revealed: ${letter}`,
  }),
  SECRET_WORD_SET: () => ({
    category: "game" as const,
    priority: "normal" as const,
    message: "Secret word has been set!",
  }),
  DIRECT_GUESS_USED: (playerName: string, remaining: number) => ({
    category: "game" as const,
    priority: "normal" as const,
    message: `${playerName} used a direct guess (${remaining} left)`,
  }),

  // Player Events
  PLAYER_JOINED: (playerName: string) => ({
    category: "player" as const,
    priority: "low" as const,
    message: `${playerName} joined`,
  }),
  PLAYER_LEFT: (playerName: string) => ({
    category: "player" as const,
    priority: "low" as const,
    message: `${playerName} left`,
  }),

  // Error Events
  ERROR_GENERIC: (message: string) => ({
    category: "error" as const,
    priority: "high" as const,
    message,
  }),
  ERROR_VALIDATION: (message: string) => ({
    category: "error" as const,
    priority: "normal" as const,
    message,
  }),

  // Success Events
  SUCCESS_GENERIC: (message: string) => ({
    category: "success" as const,
    priority: "normal" as const,
    message,
  }),
} as const;

// Helper to create a notification from a template
export function createNotification(
  template: ReturnType<
    (typeof NotificationTemplates)[keyof typeof NotificationTemplates]
  >,
  metadata?: GameNotification["metadata"]
): Omit<GameNotification, "id" | "timestamp"> {
  return {
    ...template,
    autoDismissMs: getDefaultDismissTime(template.priority),
    metadata,
  };
}

function getDefaultDismissTime(priority: NotificationPriority): number {
  switch (priority) {
    case "high":
      return 4000;
    case "normal":
      return 3000;
    case "low":
      return 2000;
  }
}

// Generate unique notification ID
export function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Notification styles based on category
 * These can be used by UI components to render appropriate styles
 * 
 * NOTE: Colors are commented out for minimal design. Keeping icons/emojis.
 */
export const NotificationStyles: Record<
  NotificationCategory,
  {
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon?: string; // Optional icon name or emoji
  }
> = {
  signull: {
    // bgColor: "bg-yellow-50",
    // borderColor: "border-yellow-300",
    // textColor: "text-yellow-800",
    bgColor: "bg-white",
    borderColor: "border-black",
    textColor: "text-black",
    icon: "📡",
  },
  connect: {
    // bgColor: "bg-blue-50",
    // borderColor: "border-blue-300",
    // textColor: "text-blue-800",
    bgColor: "bg-white",
    borderColor: "border-black",
    textColor: "text-black",
    icon: "🔗",
  },
  game: {
    // bgColor: "bg-amber-50",
    // borderColor: "border-amber-300",
    // textColor: "text-amber-800",
    bgColor: "bg-white",
    borderColor: "border-black",
    textColor: "text-black",
    icon: "🎮",
  },
  player: {
    // bgColor: "bg-gray-50",
    // borderColor: "border-gray-300",
    // textColor: "text-gray-700",
    bgColor: "bg-white",
    borderColor: "border-black",
    textColor: "text-black",
    icon: "👤",
  },
  error: {
    // bgColor: "bg-red-50",
    // borderColor: "border-red-300",
    // textColor: "text-red-800",
    bgColor: "bg-white",
    borderColor: "border-black",
    textColor: "text-black",
    icon: "❌",
  },
  success: {
    // bgColor: "bg-green-50",
    // borderColor: "border-green-300",
    // textColor: "text-green-800",
    bgColor: "bg-white",
    borderColor: "border-black",
    textColor: "text-black",
    icon: "✅",
  },
  info: {
    bgColor: "bg-white",
    borderColor: "border-black",
    textColor: "text-black",
  },
};
