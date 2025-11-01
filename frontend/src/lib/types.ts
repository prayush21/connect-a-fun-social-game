import { Timestamp, FieldValue } from "firebase/firestore";

// Core game types based on Firestore data model
export type PlayerId = string;
export type RoomId = string;

export type GamePhase = "lobby" | "setting_word" | "guessing" | "ended";
export type PlayerRole = "setter" | "guesser";
export type GameWinner = null | "guessers" | "setter";

export interface Player {
  id: PlayerId;
  name: string;
  role: PlayerRole;
  isOnline: boolean;
  lastActive: Date;
}

export interface GameSettings {
  majorityThreshold: number; // ABSOLUTE count of guessers required (excludes current clue giver). Will be clamped to 1..eligible guessers
  timeLimit: number; // Time limit for reference setting in seconds
  maxPlayers: number;
  wordValidation: "strict" | "relaxed";
  connectsRequired: number; // Number of connections required for game progression
}

export interface Reference {
  // Unique identifier for the reference to make resolution idempotent
  id?: string;
  clueGiverId: PlayerId;
  referenceWord: string;
  clue: string;
  guesses: Record<PlayerId, string>;
  setterAttempt: string;
  isClimactic: boolean;
  timestamp: Date;
}

export interface GameState {
  roomId: RoomId;
  gamePhase: GamePhase;
  secretWord: string;
  revealedCount: number;
  clueGiverTurn: number; // Index for round-robin clue giving
  roundNumber: number;
  setterUid: PlayerId;
  players: Record<PlayerId, Player>;
  directGuessesLeft: number;
  thresholdMajority: number; // Absolute count mirror for UI (minimum matching connections)
  currentReference: Reference | null;
  winner: GameWinner;
  gameHistory: (
    | string
    | {
        id: string;
        message: string;
        timestamp: Date | Timestamp | FieldValue;
        type?: "info" | "success" | "warning" | "error";
        alignment?: "left" | "center" | "right";
        playerId?: string;
      }
  )[];
  settings: GameSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Firestore document structure (matches the data model)
export interface FirestoreGameRoom {
  roomId: string;
  gamePhase: GamePhase;
  secretWord: string;
  revealedCount: number;
  clueGiverTurn: number;
  roundNumber: number;
  setterUid: string;
  players: Record<
    string,
    {
      name: string;
      role: PlayerRole;
      isOnline?: boolean;
      lastActive?: Timestamp | FieldValue; // Firestore Timestamp
    }
  >;
  directGuessesLeft: number;
  thresholdMajority: number;
  currentReference: {
    clueGiverId: string;
    clue: string;
    referenceWord: string;
    guesses: Record<string, string>;
    setterAttempt: string;
    isClimactic: boolean;
    timestamp?: Timestamp | FieldValue; // Firestore Timestamp
  } | null;
  winner: GameWinner;
  gameHistory: (
    | string
    | {
        id: string;
        message: string;
        timestamp: Date | Timestamp | FieldValue;
        type?: "info" | "success" | "warning" | "error";
        alignment?: "left" | "center" | "right";
        playerId?: string;
      }
  )[];
  settings?: {
    majorityThreshold: number;
    timeLimit: number;
    maxPlayers: number;
    wordValidation: "strict" | "relaxed";
    connectsRequired?: number; // Optional for backward compatibility with existing rooms
  };
  createdAt?: Timestamp | FieldValue; // Firestore Timestamp
  updatedAt?: Timestamp | FieldValue; // Firestore Timestamp
}

// UI-specific types
export interface UiState {
  // theme removed - light mode only for now
  modals: {
    endRound: boolean;
    info: boolean;
    feedback: boolean;
  };
}

export interface AuthState {
  username: string;
  sessionId: string;
}

// Game actions/events
export type GameAction =
  | { type: "CREATE_ROOM"; payload: { username: string } }
  | { type: "JOIN_ROOM"; payload: { roomId: string; username: string } }
  | { type: "LEAVE_ROOM" }
  | { type: "SET_WORD"; payload: { word: string } }
  | { type: "SET_REFERENCE"; payload: { referenceWord: string; clue: string } }
  | { type: "SUBMIT_GUESS"; payload: { guess: string } }
  | { type: "SUBMIT_DIRECT_GUESS"; payload: { word: string } }
  | { type: "REMOVE_PLAYER"; payload: { playerId: PlayerId } }
  | { type: "CHANGE_SETTER"; payload: { playerId: PlayerId } }
  | { type: "UPDATE_SETTINGS"; payload: Partial<GameSettings> };

// Error types
export interface GameError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Analytics events
export type AnalyticsEvent =
  | {
      name: "game_created";
      properties: { roomId: string; playerCount: number };
    }
  | { name: "game_joined"; properties: { roomId: string; playerCount: number } }
  | {
      name: "game_started";
      properties: { roomId: string; playerCount: number };
    }
  | { name: "word_set"; properties: { roomId: string; wordLength: number } }
  | {
      name: "reference_set";
      properties: { roomId: string; clueLength: number };
    }
  | {
      name: "guess_submitted";
      properties: { roomId: string; isDirect: boolean };
    }
  | {
      name: "game_ended";
      properties: { roomId: string; winner: GameWinner; duration: number };
    }
  | {
      name: "player_left";
      properties: { roomId: string; playerCount: number };
    };

// Utility types for derived state
export interface DerivedGameState {
  activeGuessers: Player[];
  currentPlayer: Player | null;
  isMyTurn: boolean;
  canSubmitDirectGuess: boolean;
  canSubmitReference: boolean;
  revealedPrefix: string;
  majorityNeeded: number;
  guessesReceived: number;
}
