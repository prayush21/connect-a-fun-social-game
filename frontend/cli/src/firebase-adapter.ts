/**
 * Firebase Adapter for CLI
 *
 * This module provides a CLI-compatible interface to Firebase operations.
 * It removes the Zustand notification dependency and adapts the environment
 * variable loading for CLI context.
 *
 * All game operations return result objects instead of throwing errors,
 * making them easier to handle in the CLI REPL.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  deleteField,
  increment,
  getDoc,
  type Firestore,
} from "firebase/firestore";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import type {
  GameState,
  GameError,
  PlayerId,
  RoomId,
  SignullId,
  SignullEntry,
  GameSettings,
  GameStatusOutput,
  SignullSummary,
  CLIOutput,
  Player,
} from "./types.js";
import {
  addSignullCore,
  submitConnectCore,
  submitDirectGuessCore,
  setSecretWordCore,
} from "@frontend/lib/beta/mutations-core";

// ==================== Firebase Configuration ====================

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

// Lazy-initialized instances
let firebaseApp: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

/**
 * Get Firebase config from environment variables
 * Supports both NEXT_PUBLIC_ prefixed (from .env.local) and non-prefixed vars
 */
const getFirebaseConfig = (): FirebaseConfig => {
  const config: FirebaseConfig = {
    apiKey:
      process.env.FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      "",
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN ||
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      "",
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      "",
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      process.env.FIREBASE_MESSAGING_SENDER_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:
      process.env.FIREBASE_APP_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
      "",
    measurementId:
      process.env.FIREBASE_MEASUREMENT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Validate required fields
  const missing: string[] = [];
  if (!config.apiKey) missing.push("FIREBASE_API_KEY");
  if (!config.authDomain) missing.push("FIREBASE_AUTH_DOMAIN");
  if (!config.projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!config.appId) missing.push("FIREBASE_APP_ID");

  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(", ")}`);
  }

  return config;
};

/**
 * Initialize Firebase app (lazy)
 */
const getFirebaseApp = (): FirebaseApp => {
  if (firebaseApp) return firebaseApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const config = getFirebaseConfig();
  firebaseApp = initializeApp(config);
  return firebaseApp;
};

/**
 * Get Firestore instance (lazy)
 */
const getDb = (): Firestore => {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  return db;
};

/**
 * Get Auth instance (lazy)
 */
const getFirebaseAuth = (): Auth => {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  return auth;
};

// ==================== Collection Reference ====================

const BETA_COLLECTION = "game_rooms_v2";
const getRoomsCollection = () => collection(getDb(), BETA_COLLECTION);

// ==================== Utility Functions ====================

/**
 * Generate a room code (6 characters: consonant-vowel-consonant-vowel-digit-digit)
 */
export const generateRoomCode = (): RoomId => {
  const consonants = "BCDFGHJKMNPQRSTVWXYZ";
  const vowels = "AEUY";
  const numbers = "23456789";
  return (
    consonants[Math.floor(Math.random() * consonants.length)] +
    vowels[Math.floor(Math.random() * vowels.length)] +
    consonants[Math.floor(Math.random() * consonants.length)] +
    vowels[Math.floor(Math.random() * vowels.length)] +
    numbers[Math.floor(Math.random() * numbers.length)] +
    numbers[Math.floor(Math.random() * numbers.length)]
  );
};

/**
 * Generate a signull ID
 */
export const generateSignullId = (): SignullId => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  return `sn_${ts}_${rand}`;
};

/**
 * Convert Firestore timestamp to Date
 */
const tsToDate = (t: unknown): Date => {
  if (t instanceof Timestamp) return t.toDate();
  if (t instanceof Date) return t;
  return new Date();
};

// ==================== Result Wrappers ====================

interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: GameError;
}

const success = <T>(data?: T): OperationResult<T> => ({
  success: true,
  data,
});

const failure = (code: string, message: string): OperationResult<never> => ({
  success: false,
  error: { code, message },
});

// ==================== Authentication ====================

/**
 * Initialize anonymous authentication
 * Returns player ID on success
 */
export const initializeAuth = async (): Promise<OperationResult<PlayerId>> => {
  try {
    const authInstance = getFirebaseAuth();
    const userCredential = await signInAnonymously(authInstance);
    return success(userCredential.user.uid);
  } catch (error) {
    return failure(
      "AUTH_FAILED",
      error instanceof Error ? error.message : "Authentication failed"
    );
  }
};

// ==================== Firestore to GameState Conversion ====================

interface FirestoreGameRoom {
  schemaVersion: number;
  roomId: RoomId;
  phase: string;
  players: Record<string, unknown>;
  hostId: string | null;
  isDisplayMode: boolean;
  setterId: string;
  secretWord: string;
  revealedCount: number;
  signullState: {
    order: Record<string, SignullId[]>;
    activeIndex: number | null;
    itemsById: Record<string, unknown>;
  };
  directGuessesLeft: number;
  lastDirectGuess: unknown;
  winner: string | null;
  settings: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

/**
 * Convert Firestore document to GameState
 */
const firestoreToGameState = (data: FirestoreGameRoom): GameState => {
  const players: Record<PlayerId, Player> = {};

  for (const [id, p] of Object.entries(data.players || {})) {
    const player = p as Record<string, unknown>;
    players[id] = {
      id,
      name: (player.name as string) || "Unknown",
      role: (player.role as "setter" | "guesser") || "guesser",
      isOnline: (player.isOnline as boolean) || false,
      lastActive: tsToDate(player.lastActive),
      score: (player.score as number) || 0,
    };
  }

  const signullItemsById: Record<SignullId, SignullEntry> = {};

  for (const [id, entry] of Object.entries(
    data.signullState?.itemsById || {}
  )) {
    const e = entry as Record<string, unknown>;
    const connects = ((e.connects as unknown[]) || []).map((c) => {
      const conn = c as Record<string, unknown>;
      return {
        playerId: (conn.playerId as string) || "",
        guess: (conn.guess as string) || "",
        timestamp: tsToDate(conn.timestamp),
        isCorrect: (conn.isCorrect as boolean) || false,
      };
    });

    signullItemsById[id] = {
      id: (e.id as string) || id,
      playerId: (e.playerId as string) || "",
      word: (e.word as string) || "",
      clue: (e.clue as string) || "",
      connects,
      isFinal: (e.isFinal as boolean) || false,
      status:
        (e.status as
          | "pending"
          | "resolved"
          | "failed"
          | "blocked"
          | "inactive") || "pending",
      createdAt: tsToDate(e.createdAt),
      resolvedAt: e.resolvedAt ? tsToDate(e.resolvedAt) : undefined,
    };
  }

  const settings = (data.settings || {}) as Record<string, unknown>;
  const lastDirectGuess = data.lastDirectGuess as Record<
    string,
    unknown
  > | null;

  return {
    schemaVersion: 2,
    roomId: data.roomId,
    phase: data.phase as "lobby" | "setting" | "signulls" | "ended",
    players,
    hostId: data.hostId,
    isDisplayMode: data.isDisplayMode || false,
    setterId: data.setterId,
    secretWord: data.secretWord || "",
    revealedCount: data.revealedCount || 0,
    signullState: {
      order: data.signullState?.order || {},
      activeIndex: data.signullState?.activeIndex ?? null,
      itemsById: signullItemsById,
    },
    directGuessesLeft: data.directGuessesLeft ?? 3,
    lastDirectGuess: lastDirectGuess
      ? {
          playerId: (lastDirectGuess.playerId as string) || "",
          playerName: (lastDirectGuess.playerName as string) || "",
          word: (lastDirectGuess.word as string) || "",
          timestamp: tsToDate(lastDirectGuess.timestamp),
        }
      : null,
    winner: (data.winner as "guessers" | "setter" | null) || null,
    settings: {
      playMode: (settings.playMode as "round_robin" | "free") || "round_robin",
      connectsRequired: (settings.connectsRequired as number) || 2,
      maxPlayers: (settings.maxPlayers as number) || 8,
      timeLimitSeconds: (settings.timeLimitSeconds as number) || 30,
      wordValidation:
        (settings.wordValidation as "strict" | "relaxed") || "strict",
      prefixMode: (settings.prefixMode as boolean) ?? true,
      displaySoundMode: (settings.displaySoundMode as boolean) ?? true,
      showScoreBreakdown: (settings.showScoreBreakdown as boolean) ?? false,
    },
    createdAt: tsToDate(data.createdAt),
    updatedAt: tsToDate(data.updatedAt),
  };
};

// ==================== Game State Helpers ====================

/**
 * Get flattened signull order from grouped order object
 */
const getFlattenedOrder = (order: Record<string, SignullId[]>): SignullId[] => {
  const keys = Object.keys(order || {})
    .map(Number)
    .sort((a, b) => a - b);
  return keys.reduce(
    (acc, key) => acc.concat(order[String(key)]),
    [] as SignullId[]
  );
};

/**
 * Get active signull ID based on game state
 */
const getActiveSignullId = (state: GameState): SignullId | null => {
  if (state.settings.playMode !== "round_robin") return null;
  if (state.signullState.activeIndex === null) return null;

  const flattenedOrder = getFlattenedOrder(state.signullState.order);
  return flattenedOrder[state.signullState.activeIndex] || null;
};

/**
 * Convert GameState to CLI-friendly status output
 * Excludes secretWord (shows revealed letters only)
 */
export const gameStateToStatusOutput = (
  state: GameState,
  currentPlayerId: PlayerId | null
): GameStatusOutput => {
  const players = Object.values(state.players).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    score: p.score,
    isOnline: p.isOnline,
  }));

  // Build revealed letters display
  const wordLength = state.secretWord.length;
  const revealedCount = state.revealedCount;
  const revealedPart = state.secretWord.slice(0, revealedCount);
  const hiddenPart = "_".repeat(Math.max(0, wordLength - revealedCount));
  const revealedLetters = revealedPart + hiddenPart;

  // Build signull summaries
  const signulls: SignullSummary[] = [];
  const flattenedOrder = getFlattenedOrder(state.signullState.order);

  for (const signullId of flattenedOrder) {
    const signull = state.signullState.itemsById[signullId];
    if (!signull) continue;

    const creatorName = state.players[signull.playerId]?.name || "Unknown";
    const correctConnectCount = signull.connects.filter(
      (c) => c.isCorrect
    ).length;

    signulls.push({
      id: signull.id,
      creatorName,
      clue: signull.clue,
      status: signull.status,
      connectCount: signull.connects.length,
      correctConnectCount,
      // Only show word for resolved/blocked signulls
      word:
        signull.status === "resolved" || signull.status === "blocked"
          ? signull.word
          : undefined,
    });
  }

  const currentPlayer = currentPlayerId ? state.players[currentPlayerId] : null;

  return {
    roomId: state.roomId,
    phase: state.phase,
    players,
    currentPlayer: currentPlayer
      ? { id: currentPlayer.id, role: currentPlayer.role }
      : null,
    revealedLetters: revealedLetters || "_".repeat(wordLength) || "???",
    letterCount: wordLength || 0,
    directGuessesLeft: state.directGuessesLeft,
    lastDirectGuess: state.lastDirectGuess
      ? {
          playerName: state.lastDirectGuess.playerName,
          word: state.lastDirectGuess.word,
        }
      : null,
    winner: state.winner,
    settings: {
      playMode: state.settings.playMode,
      connectsRequired: state.settings.connectsRequired,
      prefixMode: state.settings.prefixMode,
    },
    signulls,
    activeSignullId: getActiveSignullId(state),
  };
};

// ==================== Core Game Operations ====================

/**
 * Check if a room exists
 */
export const checkRoomExists = async (
  roomId: RoomId
): Promise<OperationResult<boolean>> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    const snap = await getDoc(docRef);
    return success(snap.exists());
  } catch (error) {
    return failure(
      "FIREBASE_ERROR",
      error instanceof Error ? error.message : "Failed to check room"
    );
  }
};

/**
 * Get current game state
 */
export const getGameState = async (
  roomId: RoomId
): Promise<OperationResult<GameState>> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return failure("ROOM_NOT_FOUND", "Room does not exist");
    }

    const data = snap.data() as FirestoreGameRoom;
    if (data.schemaVersion !== 2) {
      return failure(
        "UNSUPPORTED_VERSION",
        "Room uses unsupported schema version"
      );
    }

    return success(firestoreToGameState(data));
  } catch (error) {
    return failure(
      "FIREBASE_ERROR",
      error instanceof Error ? error.message : "Failed to get game state"
    );
  }
};

/**
 * Create a new room
 */
export const createRoom = async (
  roomId: RoomId,
  creatorId: PlayerId,
  username: string,
  settings?: Partial<GameSettings>
): Promise<OperationResult<void>> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);

    const finalSettings = {
      playMode: settings?.playMode || "round_robin",
      connectsRequired: settings?.connectsRequired || 2,
      maxPlayers: settings?.maxPlayers || 8,
      timeLimitSeconds: settings?.timeLimitSeconds || 30,
      wordValidation: settings?.wordValidation || "strict",
      prefixMode: settings?.prefixMode ?? true,
      showScoreBreakdown: settings?.showScoreBreakdown ?? true,
      displaySoundMode: settings?.displaySoundMode ?? true,
    };

    const initial = {
      schemaVersion: 2,
      roomId,
      phase: "lobby",
      players: {
        [creatorId]: {
          name: username,
          role: "setter",
          isOnline: true,
          lastActive: serverTimestamp(),
          score: 0,
        },
      },
      hostId: creatorId,
      isDisplayMode: false,
      setterId: creatorId,
      secretWord: "",
      revealedCount: 0,
      signullState: {
        order: {},
        activeIndex: finalSettings.playMode === "round_robin" ? 0 : null,
        itemsById: {},
      },
      directGuessesLeft: 3,
      lastDirectGuess: null,
      winner: null,
      settings: finalSettings,
      scoreEvents: [],
      scoreCountingComplete: false,
      insights: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, initial);
    return success();
  } catch (error) {
    return failure(
      "FIREBASE_ERROR",
      error instanceof Error ? error.message : "Failed to create room"
    );
  }
};

/**
 * Join an existing room
 */
export const joinRoom = async (
  roomId: RoomId,
  playerId: PlayerId,
  username: string
): Promise<OperationResult<{ role: "setter" | "guesser" }>> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    let assignedRole: "setter" | "guesser" = "guesser";

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

      const data = snap.data() as FirestoreGameRoom;

      if (!["lobby", "setting", "signulls"].includes(data.phase)) {
        throw new Error("INVALID_PHASE");
      }

      // Check if player already exists in room
      if (data.players[playerId]) {
        // Player already in room, update online status
        assignedRole = (data.players[playerId] as Record<string, unknown>)
          .role as "setter" | "guesser";
        trx.update(docRef, {
          [`players.${playerId}.isOnline`]: true,
          [`players.${playerId}.lastActive`]: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      if (
        Object.keys(data.players).length >=
        ((data.settings as Record<string, unknown>).maxPlayers as number)
      ) {
        throw new Error("ROOM_FULL");
      }

      const isFirstPlayer = Object.keys(data.players).length === 0;
      const shouldBecomeHost = !data.hostId || isFirstPlayer;
      assignedRole = shouldBecomeHost ? "setter" : "guesser";

      const updates: Record<string, unknown> = {
        [`players.${playerId}`]: {
          name: username,
          role: assignedRole,
          isOnline: true,
          lastActive: serverTimestamp(),
          score: 0,
        },
        updatedAt: serverTimestamp(),
      };

      if (shouldBecomeHost) {
        updates.hostId = playerId;
        updates.setterId = playerId;
      }

      trx.update(docRef, updates);
    });

    return success({ role: assignedRole });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to join room";
    if (message === "ROOM_NOT_FOUND") {
      return failure("ROOM_NOT_FOUND", "Room does not exist");
    }
    if (message === "ROOM_FULL") {
      return failure("ROOM_FULL", "Room is full");
    }
    if (message === "INVALID_PHASE") {
      return failure("INVALID_PHASE", "Invalid phase");
    }
    return failure("FIREBASE_ERROR", message);
  }
};

/**
 * Leave a room
 */
export const leaveRoom = async (
  roomId: RoomId,
  playerId: PlayerId
): Promise<OperationResult<void>> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

      const data = snap.data() as FirestoreGameRoom;
      if (!data.players[playerId]) throw new Error("PLAYER_NOT_FOUND");

      const isSetter = data.setterId === playerId;
      const isHost = data.hostId === playerId;
      const remainingIds = Object.keys(data.players).filter(
        (id) => id !== playerId
      );

      const updates: Record<string, unknown> = {
        [`players.${playerId}`]: deleteField(),
        updatedAt: serverTimestamp(),
      };

      if (isHost && remainingIds.length > 0) {
        updates.hostId = remainingIds[0];
      } else if (isHost && remainingIds.length === 0) {
        updates.hostId = null;
      }

      if (isSetter && remainingIds.length > 0) {
        updates.setterId = remainingIds[0];
        updates[`players.${remainingIds[0]}.role`] = "setter";
      } else if (isSetter && remainingIds.length === 0) {
        updates.setterId = null;
      }

      trx.update(docRef, updates);
    });

    return success();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to leave room";
    if (message === "ROOM_NOT_FOUND") {
      return failure("ROOM_NOT_FOUND", "Room does not exist");
    }
    if (message === "PLAYER_NOT_FOUND") {
      return failure("PLAYER_NOT_FOUND", "Player not found");
    }
    return failure("FIREBASE_ERROR", message);
  }
};

/**
 * Set the secret word (setter only)
 */
export const setSecretWord = async (
  roomId: RoomId,
  setterId: PlayerId,
  word: string
): Promise<OperationResult<void>> => {
  try {
    await setSecretWordCore({ getRoomsCollection }, roomId, setterId, word);

    return success();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set word";
    return failure(message, message);
  }
};

/**
 * Add a signull (guesser only)
 */
export const addSignull = async (
  roomId: RoomId,
  playerId: PlayerId,
  word: string,
  clue: string
): Promise<OperationResult<SignullId>> => {
  try {
    const signullId = await addSignullCore(
      { getRoomsCollection },
      roomId,
      playerId,
      word,
      clue
    );

    return success(signullId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add signull";
    return failure(message, message);
  }
};

/**
 * Submit a connect guess
 */
export const submitConnect = async (
  roomId: RoomId,
  playerId: PlayerId,
  signullId: SignullId,
  guess: string
): Promise<OperationResult<void>> => {
  try {
    await submitConnectCore(
      { getRoomsCollection },
      roomId,
      playerId,
      signullId,
      guess
    );

    return success();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit connect";
    return failure(message, message);
  }
};

/**
 * Submit a direct guess (guesser only)
 */
export const submitDirectGuess = async (
  roomId: RoomId,
  playerId: PlayerId,
  guess: string
): Promise<OperationResult<void>> => {
  try {
    await submitDirectGuessCore(
      { getRoomsCollection },
      roomId,
      playerId,
      guess
    );

    return success();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit guess";
    return failure(message, message);
  }
};

/**
 * Intercept a signull (setter only) - same as submitConnect but for setter
 */
export const interceptSignull = async (
  roomId: RoomId,
  setterId: PlayerId,
  signullId: SignullId,
  guess: string
): Promise<OperationResult<void>> => {
  // Setter intercept uses the same mechanism as submitConnect
  return submitConnect(roomId, setterId, signullId, guess);
};

/**
 * Start the game (transition from lobby to setting phase)
 */
export const startGame = async (
  roomId: RoomId
): Promise<OperationResult<void>> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    await updateDoc(docRef, {
      phase: "setting",
      updatedAt: serverTimestamp(),
    });
    return success();
  } catch (error) {
    return failure(
      "FIREBASE_ERROR",
      error instanceof Error ? error.message : "Failed to start game"
    );
  }
};

/**
 * Change the setter to another player (host only, lobby/setting phase)
 */
export const changeSetter = async (
  roomId: RoomId,
  newSetterId: PlayerId,
  requesterId: PlayerId
): Promise<OperationResult<void>> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

      const data = snap.data() as FirestoreGameRoom;

      // Only host can change setter
      if (data.hostId !== requesterId) {
        throw new Error("ONLY_HOST_CAN_CHANGE_SETTER");
      }

      // Only allow in lobby or setting phase
      if (data.phase !== "lobby" && data.phase !== "setting") {
        throw new Error("CAN_ONLY_CHANGE_SETTER_IN_LOBBY_OR_SETTING");
      }

      if (!data.players[newSetterId]) throw new Error("PLAYER_NOT_FOUND");

      const oldSetterId = data.setterId;

      trx.update(docRef, {
        setterId: newSetterId,
        [`players.${oldSetterId}.role`]: "guesser",
        [`players.${newSetterId}.role`]: "setter",
        updatedAt: serverTimestamp(),
      });
    });

    return success();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to change setter";
    if (message === "ONLY_HOST_CAN_CHANGE_SETTER") {
      return failure(message, "Only the host can change the setter");
    }
    if (message === "CAN_ONLY_CHANGE_SETTER_IN_LOBBY_OR_SETTING") {
      return failure(
        message,
        "Can only change setter during lobby or setting phase"
      );
    }
    if (message === "PLAYER_NOT_FOUND") {
      return failure(message, "Player not found in room");
    }
    return failure(message, message);
  }
};

// ==================== Subscription (for future real-time features) ====================

/**
 * Subscribe to room updates (returns unsubscribe function)
 * Currently not used in CLI but available for future enhancements
 */
export const subscribeToRoom = (
  roomId: RoomId,
  callback: (state: GameState | null, error?: GameError) => void
): (() => void) => {
  const docRef = doc(getRoomsCollection(), roomId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      try {
        const data = snap.data() as FirestoreGameRoom;
        if (data.schemaVersion !== 2) {
          callback(null, {
            code: "UNSUPPORTED_VERSION",
            message: "Schema version mismatch",
          });
          return;
        }
        callback(firestoreToGameState(data));
      } catch (e) {
        callback(null, {
          code: "PARSE_ERROR",
          message: (e as Error).message,
        });
      }
    },
    (err) => {
      callback(null, {
        code: "SUBSCRIBE_ERROR",
        message: err.message,
      });
    }
  );
};
