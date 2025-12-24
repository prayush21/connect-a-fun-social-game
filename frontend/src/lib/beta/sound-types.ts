/**
 * Sound Types and Configuration for Game Audio Notifications
 *
 * This module defines the types and configurations for all game sounds.
 * It maps game events to their corresponding audio files.
 */

/**
 * All available sound events in the game
 */
export type SoundEvent =
  // Signull-related sounds
  | "signull_sent" // When any signull is sent
  | "signull_received" // When receiving a signull from another player
  | "signull_resolved" // When a signull is successfully resolved
  | "signull_intercepted" // When setter intercepts a signull
  | "signull_failed" // When a signull fails

  // Connect-related sounds
  | "connect_sent" // When you send a connect
  | "connect_received" // When someone connects to a signull

  // Game state sounds
  | "game_start" // Game starts (secret word set)
  | "game_end_win" // Guessers win
  | "game_end_lose" // Setter wins

  // Letter/guess sounds
  | "letter_revealed" // A letter is revealed
  | "direct_guess_correct" // Correct direct guess
  | "direct_guess_wrong" // Wrong direct guess

  // Scoring sounds
  | "score_point" // Standard point scored
  | "extra_game_point" // Bonus point scored

  // Player sounds
  | "player_joined" // Player joins the room
  | "player_left" // Player leaves the room

  // UI feedback sounds
  | "button_click" // Generic button click
  | "error" // Error notification
  | "success" // Success notification
  | "notification"; // Generic notification

/**
 * Configuration for each sound event
 */
export interface SoundConfig {
  /**
   * Path to the audio file (relative to /public/sounds/)
   */
  file: string;

  /**
   * Default volume for this sound (0.0 to 1.0)
   * Can be overridden by user preferences
   */
  defaultVolume: number;

  /**
   * Human-readable description for settings UI
   */
  description: string;

  /**
   * Category for grouping in settings
   */
  category: SoundCategory;

  /**
   * Whether this sound is critical (should play even in "reduced" mode)
   */
  critical?: boolean;
}

/**
 * Sound categories for grouping in settings
 */
export type SoundCategory =
  | "signull"
  | "connect"
  | "game"
  | "player"
  | "ui"
  | "feedback";

/**
 * User sound preferences
 */
export interface SoundPreferences {
  /**
   * Master switch for all sounds
   */
  enabled: boolean;

  /**
   * Master volume (0.0 to 1.0)
   */
  volume: number;

  /**
   * Sound mode: 'all' | 'important' | 'none'
   * - all: Play all sounds
   * - important: Only play critical sounds (game start, end, letter reveal)
   * - none: No sounds (same as enabled: false)
   */
  mode: "all" | "important" | "none";

  /**
   * Per-category volume overrides (optional)
   */
  categoryVolumes?: Partial<Record<SoundCategory, number>>;
}

/**
 * Default sound preferences
 */
export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 0.7,
  mode: "all",
};

/**
 * Sound configurations for all events
 *
 * Note: Audio files need to be added to /public/sounds/
 * See /public/sounds/README.md for audio requirements
 */
export const SOUND_CONFIGS: Record<SoundEvent, SoundConfig> = {
  // Signull sounds
  signull_sent: {
    file: "signull-sent.mp3",
    defaultVolume: 0.6,
    description: "When you send a Signull",
    category: "signull",
  },
  signull_received: {
    file: "signull-received.mp3",
    defaultVolume: 0.7,
    description: "When another player sends a Signull",
    category: "signull",
    critical: true,
  },
  signull_resolved: {
    file: "signull-resolved.mp3",
    defaultVolume: 0.8,
    description: "When a Signull is resolved",
    category: "signull",
    critical: true,
  },
  signull_intercepted: {
    file: "signull-intercepted.mp3",
    defaultVolume: 0.8,
    description: "When setter intercepts a Signull",
    category: "signull",
    critical: true,
  },
  signull_failed: {
    file: "signull-failed.mp3",
    defaultVolume: 0.6,
    description: "When a Signull fails",
    category: "signull",
  },

  // Connect sounds
  connect_sent: {
    file: "connect-sent.mp3",
    defaultVolume: 0.5,
    description: "When you send a connect",
    category: "connect",
  },
  connect_received: {
    file: "connect-received.mp3",
    defaultVolume: 0.6,
    description: "When someone connects",
    category: "connect",
  },

  // Game state sounds
  game_start: {
    file: "game-start.mp3",
    defaultVolume: 0.8,
    description: "When the game starts",
    category: "game",
    critical: true,
  },
  game_end_win: {
    file: "game-end-win.mp3",
    defaultVolume: 0.9,
    description: "When guessers win",
    category: "game",
    critical: true,
  },
  game_end_lose: {
    file: "game-end-lose.mp3",
    defaultVolume: 0.8,
    description: "When setter wins",
    category: "game",
    critical: true,
  },

  // Letter/guess sounds
  letter_revealed: {
    file: "letter-revealed.mp3",
    defaultVolume: 0.7,
    description: "When a letter is revealed",
    category: "game",
    critical: true,
  },
  direct_guess_correct: {
    file: "direct-guess-correct.mp3",
    defaultVolume: 0.9,
    description: "Correct direct guess",
    category: "game",
    critical: true,
  },
  direct_guess_wrong: {
    file: "direct-guess-wrong.mp3",
    defaultVolume: 0.7,
    description: "Wrong direct guess",
    category: "game",
  },

  // Scoring sounds
  score_point: {
    file: "score-point.mp3",
    defaultVolume: 0.6,
    description: "Standard point scored",
    category: "game",
    critical: true,
  },
  extra_game_point: {
    file: "extra-game-point.mp3",
    defaultVolume: 0.7,
    description: "Bonus point scored",
    category: "game",
    critical: true,
  },

  // Player sounds
  player_joined: {
    file: "player-joined.mp3",
    defaultVolume: 0.5,
    description: "When a player joins",
    category: "player",
  },
  player_left: {
    file: "player-left.mp3",
    defaultVolume: 0.4,
    description: "When a player leaves",
    category: "player",
  },

  // UI feedback sounds
  button_click: {
    file: "button-click.mp3",
    defaultVolume: 0.3,
    description: "Button click sound",
    category: "ui",
  },
  error: {
    file: "error.mp3",
    defaultVolume: 0.6,
    description: "Error notification",
    category: "feedback",
  },
  success: {
    file: "success.mp3",
    defaultVolume: 0.6,
    description: "Success notification",
    category: "feedback",
  },
  notification: {
    file: "new-clue.mp3", // Using existing file as fallback
    defaultVolume: 0.5,
    description: "General notification",
    category: "feedback",
  },
};

/**
 * Map notification categories to sound events
 */
export const NOTIFICATION_TO_SOUND: Record<string, SoundEvent> = {
  signull: "signull_received",
  connect: "connect_received",
  game: "notification",
  player: "player_joined",
  error: "error",
  success: "success",
  info: "notification",
};

/**
 * Get the sound event for a notification template
 */
export function getSoundForNotification(
  templateName: string
): SoundEvent | null {
  const soundMap: Partial<Record<string, SoundEvent>> = {
    SIGNULL_SENT_SELF: "signull_sent",
    SIGNULL_SENT_OTHER: "signull_received",
    SIGNULL_RESOLVED: "signull_resolved",
    SIGNULL_INTERCEPTED: "signull_intercepted",
    SIGNULL_FAILED: "signull_failed",
    CONNECT_SENT_SELF: "connect_sent",
    CONNECT_RECEIVED: "connect_received",
    GAME_STARTED: "game_start",
    GAME_ENDED_GUESSERS_WIN: "game_end_win",
    GAME_ENDED_SETTER_WINS: "game_end_lose",
    LETTER_REVEALED: "letter_revealed",
    SECRET_WORD_SET: "game_start",
    DIRECT_GUESS_USED: "notification",
    PLAYER_JOINED: "player_joined",
    PLAYER_LEFT: "player_left",
    ERROR_GENERIC: "error",
    ERROR_VALIDATION: "error",
    SUCCESS_GENERIC: "success",
  };

  return soundMap[templateName] ?? null;
}
