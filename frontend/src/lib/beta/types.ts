// New beta schema types (no backward compatibility)
// Firestore Timestamp imported only for runtime conversion typing; prefer Date in state.
import { Timestamp, FieldValue } from "firebase/firestore";

export type PlayerId = string;
export type RoomId = string;
export type SignullId = string;
export type GameWinner = null | "guessers" | "setter";

// ==================== Scoring Types ====================

/**
 * Scoring constants for the game
 */
export const SCORING = {
  // Signull scenarios
  CORRECT_GUESS_ON_SIGNULL: 5, // [DEPRECATED] No longer used for guessers
  INTERCEPT_SIGNULL: 5, // Setter who intercepts a signull (immediate)
  SIGNULL_RESOLVED: 10, // Player whose signull gets resolved
  CONNECT_TO_RESOLVED_SIGNULL: 5, // Points for guessers with correct connect to resolved signull
  LIGHTNING_SIGNULL_PER_REMAINING_LETTER: 5, // Points per remaining letter when signull word equals secret word
  SETTER_REVEALED_LETTERS_BONUS: 5, // Points to setter per revealed letter when lightning signull occurs
} as const;

/**
 * Represents a single score change event for audit/history
 */
export interface ScoreEvent {
  playerId: PlayerId;
  delta: number;
  reason: ScoreReason;
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * Reason codes for score changes
 */
export type ScoreReason =
  | "correct_signull_guess" // Player guessed the signull word correctly
  | "intercept_signull" // Setter intercepted a signull
  | "signull_resolved" // Player's signull was resolved
  | "connect_to_resolved_signull" // Points for correct connect to resolved signull
  | "lightning_signull_bonus" // Bonus for remaining letters when signull word matches secret word
  | "setter_revealed_letters_bonus" // Setter bonus for revealed letters on lightning signull
  | "failed_lightning_signull_bonus"; // Bonus for creator and correct connectors when lightning signull fails

/**
 * Represents score updates to be applied in a transaction
 */
export interface ScoreUpdates {
  [playerId: PlayerId]: number; // delta to add to current score
}

export type PlayerRole = "setter" | "guesser";
export type GamePhase = "lobby" | "setting" | "signulls" | "ended";
export type PlayMode = "round_robin" | "free"; // free = no enforced turn order
export type SignullStatus =
  | "pending"
  | "resolved"
  | "failed"
  | "blocked"
  | "inactive"; // blocked = setter intercepted

export interface Player {
  id: PlayerId;
  name: string;
  role: PlayerRole;
  isOnline: boolean;
  lastActive: Date; // normalized client-side
  score: number; // cumulative points (initialize 0)
}

export interface SignullConnect {
  playerId: PlayerId;
  guess: string; // uppercase canonical form
  timestamp: Date;
  isCorrect: boolean;
}

export interface SignullEntry {
  id: SignullId;
  playerId: PlayerId; // clue giver
  word: string; // reference word UPPERCASE
  clue: string;
  connects: SignullConnect[];
  isFinal: boolean; // marks potential game-ending reference
  status: SignullStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface SignullState {
  order: Record<string, SignullId[]>; // grouped by revealedCount stage (key is stringified index)
  itemsById: Record<SignullId, SignullEntry>;
  activeIndex: number | null; // used only in round_robin mode (index into flattened order)
}

export interface GameSettings {
  playMode: PlayMode;
  connectsRequired: number; // number of correct connects required to resolve
  maxPlayers: number;
  timeLimitSeconds: number; // limit for setting secret word or signull
  wordValidation: "strict" | "relaxed";
  prefixMode: boolean;
  showScoreBreakdown: boolean; // Whether to show score counting animation at game end
}

export interface LastDirectGuess {
  playerId: PlayerId;
  playerName: string;
  word: string; // UPPERCASE
  timestamp: Date;
}

export interface GameState {
  schemaVersion: 2; // fixed version for beta schema
  roomId: RoomId;
  phase: GamePhase;
  players: Record<PlayerId, Player>;
  hostId: PlayerId | null; // Host player who controls game settings (first joiner in display mode)
  isDisplayMode: boolean; // Whether room was created with a display device
  setterId: PlayerId;
  secretWord: string; // UPPERCASE
  revealedCount: number;
  signullState: SignullState;
  directGuessesLeft: number;
  lastDirectGuess: LastDirectGuess | null; // tracks who made the last direct guess
  winner: GameWinner;
  settings: GameSettings;
  scoreEvents: ScoreEvent[]; // Chronological history of all scoring events
  scoreCountingComplete: boolean; // Whether score counting animation has completed
  createdAt: Date; // snapshot conversion from Firestore Timestamp
  updatedAt: Date;
}

export interface GameError {
  code: string; // machine readable
  message: string; // human readable
  details?: Record<string, unknown>;
}

// Firestore raw shapes (used internally in firebase.ts) – keep minimal.
// Firestore raw timestamp values may be either a concrete Timestamp (after read)
// or a serverTimestamp() FieldValue sentinel during writes.
export type FirestoreTimeValue = Timestamp | FieldValue;

export interface FirestoreSignullConnect {
  playerId: PlayerId;
  guess: string;
  timestamp: FirestoreTimeValue; // serverTimestamp sentinel until resolved
  isCorrect: boolean;
}

export interface FirestoreSignullEntry {
  id: SignullId;
  playerId: PlayerId;
  word: string;
  clue: string;
  connects: FirestoreSignullConnect[];
  isFinal: boolean;
  status: SignullStatus;
  createdAt: FirestoreTimeValue;
  resolvedAt?: FirestoreTimeValue;
}

export interface FirestoreLastDirectGuess {
  playerId: PlayerId;
  playerName: string;
  word: string;
  timestamp: FirestoreTimeValue;
}

export interface FirestoreScoreEvent {
  playerId: PlayerId;
  delta: number;
  reason: ScoreReason;
  timestamp: FirestoreTimeValue;
  details?: Record<string, unknown>;
}

export interface FirestoreGameRoom {
  schemaVersion: 2;
  roomId: RoomId;
  phase: GamePhase;
  players: Record<
    PlayerId,
    {
      name: string;
      role: PlayerRole;
      isOnline: boolean;
      lastActive: FirestoreTimeValue;
      score: number; // stored as number; increment via transactions
    }
  >;
  hostId: PlayerId | null; // Host player who controls game settings
  isDisplayMode: boolean; // Whether room was created with a display device
  setterId: PlayerId;
  secretWord: string;
  revealedCount: number;
  signullState: {
    order: Record<string, SignullId[]>;
    activeIndex: number | null;
    itemsById: Record<SignullId, FirestoreSignullEntry>;
  };
  directGuessesLeft: number;
  lastDirectGuess: FirestoreLastDirectGuess | null;
  winner: GameWinner;
  settings: {
    playMode: PlayMode;
    connectsRequired: number;
    maxPlayers: number;
    timeLimitSeconds: number;
    wordValidation: "strict" | "relaxed";
    prefixMode: boolean;
    showScoreBreakdown: boolean;
  };
  scoreEvents: FirestoreScoreEvent[];
  scoreCountingComplete: boolean;
  createdAt: FirestoreTimeValue;
  updatedAt: FirestoreTimeValue;
}
