import type {
  FirestoreTimeValue,
  FirestoreSignullConnect,
  GameInsight,
  GamePhase,
  GameSettings,
  GameWinner,
  LastDirectGuess,
  PlayerId,
  PlayerRole,
  RoomId,
  ScoreEvent,
  SignullConnect,
  SignullId,
  SignullStatus,
} from "../types";

export type RoundId = string;

export interface V3RoomDoc {
  schemaVersion: 3;
  roomId: RoomId;
  phase: GamePhase;
  hostId: PlayerId | null;
  setterId: PlayerId | null;
  currentRoundId: RoundId | null;
  isDisplayMode: boolean;
  settings: GameSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type FirestoreV3RoomDoc = Omit<V3RoomDoc, "createdAt" | "updatedAt"> & {
  createdAt: FirestoreTimeValue;
  updatedAt: FirestoreTimeValue;
};

export type FirestoreV3RoundDoc = Omit<
  V3RoundDoc,
  "startedAt" | "endedAt" | "updatedAt"
> & {
  startedAt: FirestoreTimeValue | null;
  endedAt: FirestoreTimeValue | null;
  updatedAt: FirestoreTimeValue;
};

export type FirestoreV3PlayerDoc = Omit<
  V3PlayerDoc,
  "lastActive" | "joinedAt" | "updatedAt"
> & {
  lastActive: FirestoreTimeValue;
  joinedAt: FirestoreTimeValue;
  updatedAt: FirestoreTimeValue;
};

export type FirestoreV3SignullDoc = Omit<
  V3SignullDoc,
  "connects" | "createdAt" | "resolvedAt"
> & {
  connects: FirestoreSignullConnect[];
  createdAt: FirestoreTimeValue;
  resolvedAt?: FirestoreTimeValue;
};

export type FirestoreV3ScoreEventDoc = Omit<V3ScoreEventDoc, "timestamp"> & {
  timestamp: FirestoreTimeValue;
};

export interface V3RoundDoc {
  roundId: RoundId;
  roomId: RoomId;
  setterId: PlayerId;
  secretWord: string;
  revealedCount: number;
  directGuessesLeft: number;
  lastDirectGuess: LastDirectGuess | null;
  winner: GameWinner;
  scoreCountingComplete: boolean;
  insights: GameInsight[];
  startedAt: Date | null;
  endedAt: Date | null;
  updatedAt: Date;
}

export interface V3PlayerDoc {
  id: PlayerId;
  name: string;
  role: PlayerRole;
  isOnline: boolean;
  lastActive: Date;
  score: number;
  joinedAt: Date;
  updatedAt: Date;
}

export interface V3SignullDoc {
  id: SignullId;
  roundId: RoundId;
  playerId: PlayerId;
  word: string;
  clue: string;
  status: SignullStatus;
  isFinal: boolean;
  stage: number;
  connects: SignullConnect[];
  createdAt: Date;
  resolvedAt?: Date;
}

export interface V3ScoreEventDoc extends ScoreEvent {
  id: string;
  roundId: RoundId;
}

export interface V3GameStateInput {
  room: V3RoomDoc;
  round: V3RoundDoc | null;
  players: V3PlayerDoc[];
  signulls?: V3SignullDoc[];
  scoreEvents?: V3ScoreEventDoc[];
}
