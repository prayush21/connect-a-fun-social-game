/**
 * CLI Types for Signull Game
 *
 * Re-exports relevant types from the frontend and adds CLI-specific types.
 */

// ==================== Player Types ====================

export type PlayerId = string;
export type RoomId = string;
export type SignullId = string;
export type GameWinner = null | "guessers" | "setter";
export type PlayerRole = "setter" | "guesser";
export type GamePhase = "lobby" | "setting" | "signulls" | "ended";
export type PlayMode = "round_robin" | "free";
export type SignullStatus =
  | "pending"
  | "resolved"
  | "failed"
  | "blocked"
  | "inactive";

// ==================== Game State Types ====================

export interface Player {
  id: PlayerId;
  name: string;
  role: PlayerRole;
  isOnline: boolean;
  lastActive: Date;
  score: number;
}

export interface SignullConnect {
  playerId: PlayerId;
  guess: string;
  timestamp: Date;
  isCorrect: boolean;
}

export interface SignullEntry {
  id: SignullId;
  playerId: PlayerId;
  word: string;
  clue: string;
  connects: SignullConnect[];
  isFinal: boolean;
  status: SignullStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface SignullState {
  order: Record<string, SignullId[]>;
  itemsById: Record<SignullId, SignullEntry>;
  activeIndex: number | null;
}

export interface GameSettings {
  playMode: PlayMode;
  connectsRequired: number;
  maxPlayers: number;
  timeLimitSeconds: number;
  wordValidation: "strict" | "relaxed";
  prefixMode: boolean;
  displaySoundMode: boolean;
  showScoreBreakdown: boolean;
}

export interface LastDirectGuess {
  playerId: PlayerId;
  playerName: string;
  word: string;
  timestamp: Date;
}

export interface GameState {
  schemaVersion: 2;
  roomId: RoomId;
  phase: GamePhase;
  players: Record<PlayerId, Player>;
  hostId: PlayerId | null;
  isDisplayMode: boolean;
  setterId: PlayerId;
  secretWord: string;
  revealedCount: number;
  signullState: SignullState;
  directGuessesLeft: number;
  lastDirectGuess: LastDirectGuess | null;
  winner: GameWinner;
  settings: GameSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ==================== CLI Session Types ====================

/**
 * Persisted session data for resuming games after terminal restart
 */
export interface CLISession {
  roomId: RoomId;
  playerId: PlayerId;
  username: string;
  role: PlayerRole;
  createdAt: string; // ISO date string
  lastActiveAt: string; // ISO date string
}

/**
 * CLI configuration options
 */
export interface CLIConfig {
  /**
   * Rate limiting configuration (extendable)
   * Currently no values - ready for future implementation
   */
  rateLimit?: {
    /** Minimum delay between commands in milliseconds */
    minDelayMs?: number;
    /** Maximum commands per minute */
    maxCommandsPerMinute?: number;
  };

  /**
   * Output format for AI compatibility
   */
  outputFormat: "text" | "json";

  /**
   * Session file path for persistence
   */
  sessionFilePath: string;
}

// ==================== CLI Output Types ====================

/**
 * Standard output wrapper for CLI responses
 */
export interface CLIOutput<T = unknown> {
  success: boolean;
  type: "info" | "error" | "update" | "state";
  message?: string;
  data?: T;
  timestamp: string;
}

/**
 * Game state output for status command
 * Excludes secretWord for guessers
 */
export interface GameStatusOutput {
  roomId: RoomId;
  phase: GamePhase;
  players: Array<{
    id: PlayerId;
    name: string;
    role: PlayerRole;
    score: number;
    isOnline: boolean;
  }>;
  currentPlayer: {
    id: PlayerId;
    role: PlayerRole;
  } | null;
  revealedLetters: string; // e.g., "CAT___" for a 6-letter word with 3 revealed
  letterCount: number;
  directGuessesLeft: number;
  lastDirectGuess: {
    playerName: string;
    word: string;
  } | null;
  winner: GameWinner;
  settings: {
    playMode: PlayMode;
    connectsRequired: number;
    prefixMode: boolean;
  };
  signulls: SignullSummary[];
  activeSignullId: SignullId | null;
}

/**
 * Signull summary for status display
 */
export interface SignullSummary {
  id: SignullId;
  creatorName: string;
  clue: string;
  status: SignullStatus;
  connectCount: number;
  correctConnectCount: number;
  // Word is only shown for resolved/blocked signulls
  word?: string;
}

/**
 * Error codes specific to CLI operations
 */
export type CLIErrorCode =
  | "NOT_CONNECTED"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "INVALID_COMMAND"
  | "MISSING_ARGUMENT"
  | "ROOM_NOT_FOUND"
  | "AUTH_FAILED"
  | "FIREBASE_ERROR";
