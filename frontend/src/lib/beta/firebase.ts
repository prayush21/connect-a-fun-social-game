import {
  collection,
  doc,
  setDoc,
  updateDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { getDb } from "../firebase/config";
import type {
  GameState,
  FirestoreGameRoom,
  PlayerId,
  RoomId,
  SignullId,
  FirestoreSignullEntry,
  SignullStatus,
  GameSettings,
  GameError,
  FirestoreTimeValue,
} from "./types";

// Collection name for beta schema
const BETA_COLLECTION = "game_rooms_v2";
const getRoomsCollection = () => collection(getDb(), BETA_COLLECTION);

// Utility generators
export const generateRoomCode = (): string => {
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

export const generateSignullId = (): SignullId => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  return `sn_${ts}_${rand}`;
};

// ---------------- Snapshot Conversion ----------------

// Convert FirestoreTimeValue (Timestamp or serverTimestamp FieldValue) to Date.
// FieldValue case (pending server timestamp) falls back to current time.
const tsToDate = (t: FirestoreTimeValue): Date =>
  t instanceof Timestamp ? t.toDate() : new Date();

export const firestoreToGameState = (data: FirestoreGameRoom): GameState => {
  return {
    schemaVersion: 2,
    roomId: data.roomId,
    phase: data.phase,
    players: Object.entries(data.players || {}).reduce(
      (acc, [id, p]) => {
        acc[id] = {
          id,
          name: p.name,
          role: p.role,
          isOnline: p.isOnline,
          lastActive: tsToDate(p.lastActive),
          score: p.score ?? 0,
        };
        return acc;
      },
      {} as GameState["players"]
    ),
    setterId: data.setterId,
    secretWord: data.secretWord,
    revealedCount: data.revealedCount ?? 0,
    signullState: {
      order: data.signullState.order || [],
      activeIndex: data.signullState.activeIndex ?? null,
      itemsById: Object.entries(data.signullState.itemsById || {}).reduce(
        (acc, [id, entry]) => {
          acc[id] = {
            id: entry.id,
            playerId: entry.playerId,
            word: entry.word,
            clue: entry.clue,
            connects: (entry.connects || []).map((c) => ({
              playerId: c.playerId,
              guess: c.guess,
              timestamp: tsToDate(c.timestamp),
              isCorrect: c.isCorrect,
            })),
            isFinal: entry.isFinal,
            status: entry.status,
            createdAt: tsToDate(entry.createdAt),
            resolvedAt: entry.resolvedAt
              ? tsToDate(entry.resolvedAt)
              : undefined,
          };
          return acc;
        },
        {} as GameState["signullState"]["itemsById"]
      ),
    },
    directGuessesLeft: data.directGuessesLeft,
    winner: data.winner,
    settings: data.settings,
    createdAt: tsToDate(data.createdAt),
    updatedAt: tsToDate(data.updatedAt),
  };
};

// ---------------- Core Firestore Operations ----------------

export const createRoom = async (
  roomId: RoomId,
  creatorId: PlayerId,
  username: string,
  settings?: Partial<GameSettings>
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  const finalSettings: GameSettings = {
    playMode: settings?.playMode || "round_robin",
    connectsRequired: settings?.connectsRequired || 2,
    maxPlayers: settings?.maxPlayers || 8,
    timeLimitSeconds: settings?.timeLimitSeconds || 30,
    wordValidation: settings?.wordValidation || "strict",
  };
  const initial: FirestoreGameRoom = {
    schemaVersion: 2,
    roomId,
    phase: "lobby",
    players: {
      [creatorId]: {
        name: username,
        role: "setter",
        isOnline: true,
        lastActive: serverTimestamp() as Timestamp,
        score: 0,
      },
    },
    setterId: creatorId,
    secretWord: "",
    revealedCount: 0,
    signullState: {
      order: [],
      activeIndex: finalSettings.playMode === "round_robin" ? 0 : null,
      itemsById: {},
    },
    directGuessesLeft: 3,
    winner: null,
    settings: finalSettings,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(docRef, initial);
};

export const joinRoom = async (
  roomId: RoomId,
  playerId: PlayerId,
  username: string
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  await runTransaction(getDb(), async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
    const data = snap.data() as FirestoreGameRoom;
    if (Object.keys(data.players).length >= data.settings.maxPlayers) {
      throw new Error("ROOM_FULL");
    }
    trx.update(docRef, {
      [`players.${playerId}`]: {
        name: username,
        role: "guesser",
        isOnline: true,
        lastActive: serverTimestamp(),
        score: 0,
      },
      updatedAt: serverTimestamp(),
    });
  });
};

export const leaveRoom = async (
  roomId: RoomId,
  playerId: PlayerId
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  await runTransaction(getDb(), async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) return; // no-op
    const data = snap.data() as FirestoreGameRoom;
    if (!data.players[playerId]) return;
    const isSetter = data.setterId === playerId;
    const remainingIds = Object.keys(data.players).filter(
      (id) => id !== playerId
    );
    const updates: Record<string, unknown> = {
      [`players.${playerId}`]: deleteField(),
      updatedAt: serverTimestamp(),
    };
    if (isSetter && remainingIds.length > 0) {
      updates["setterId"] = remainingIds[0];
      updates[`players.${remainingIds[0]}.role`] = "setter";
    }
    trx.update(docRef, updates);
  });
};

export const setSecretWord = async (
  roomId: RoomId,
  setterId: PlayerId,
  word: string
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  const upper = word.trim().toUpperCase();
  await runTransaction(getDb(), async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
    const data = snap.data() as FirestoreGameRoom;
    if (data.setterId !== setterId) throw new Error("NOT_SETTER");
    if (data.phase !== "lobby" && data.phase !== "setting")
      throw new Error("INVALID_PHASE");
    trx.update(docRef, {
      secretWord: upper,
      phase: "signulls",
      updatedAt: serverTimestamp(),
    });
  });
};

export const addSignull = async (
  roomId: RoomId,
  playerId: PlayerId,
  word: string,
  clue: string
): Promise<SignullId> => {
  const docRef = doc(getRoomsCollection(), roomId);
  const signullId = generateSignullId();
  await runTransaction(getDb(), async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
    const data = snap.data() as FirestoreGameRoom;
    if (data.phase !== "signulls") throw new Error("INVALID_PHASE");
    const player = data.players[playerId];
    if (!player) throw new Error("PLAYER_NOT_FOUND");
    if (player.role !== "guesser") throw new Error("ONLY_GUESSER_CAN_CREATE");
    const playMode = data.settings.playMode;
    const upperWord = word.trim().toUpperCase();
    const isFinal = upperWord === data.secretWord;
    const newEntry: FirestoreSignullEntry = {
      id: signullId,
      playerId,
      word: upperWord,
      clue,
      connects: [],
      isFinal,
      status: "pending",
      createdAt: serverTimestamp() as Timestamp,
    };
    const newOrder = [...data.signullState.order, signullId];
    const activeIndex = playMode === "round_robin" ? newOrder.length - 1 : null;
    trx.update(docRef, {
      "signullState.order": newOrder,
      "signullState.activeIndex": activeIndex,
      [`signullState.itemsById.${signullId}`]: newEntry,
      updatedAt: serverTimestamp(),
    });
  });
  return signullId;
};

// Helper to compute resolution outcome
interface ResolutionResult {
  status: SignullStatus;
  gameEnded: boolean;
  winner: GameState["winner"];
  resolvedAt: FirestoreTimeValue | null;
}

// Exported for unit testing of resolution logic
export const evaluateResolution = (
  entry: FirestoreSignullEntry,
  data: FirestoreGameRoom
): ResolutionResult | null => {
  if (entry.status !== "pending") return null; // already resolved/failed
  const connectsRequired = data.settings.connectsRequired;
  const guesserIds = Object.keys(data.players).filter(
    (id) => data.players[id].role === "guesser"
  );
  const connects = entry.connects;
  const correctCount = connects.filter((c) => c.isCorrect).length;
  const setterBlocks = connects.some(
    (c) => data.players[c.playerId]?.role === "setter" && c.isCorrect
  );
  if (setterBlocks) {
    return {
      status: "blocked",
      gameEnded: false,
      winner: data.winner,
      resolvedAt: serverTimestamp(),
    };
  }
  if (entry.isFinal && correctCount > 0) {
    return {
      status: "resolved",
      gameEnded: true,
      winner: "guessers",
      resolvedAt: serverTimestamp(),
    };
  }
  if (correctCount >= connectsRequired) {
    return {
      status: "resolved",
      gameEnded: false,
      winner: data.winner,
      resolvedAt: serverTimestamp(),
    };
  }
  const allGuessersAttempted = guesserIds.every((gid) =>
    connects.some((c) => c.playerId === gid)
  );
  if (allGuessersAttempted && correctCount < connectsRequired) {
    return {
      status: "failed",
      gameEnded: false,
      winner: data.winner,
      resolvedAt: serverTimestamp(),
    };
  }
  return null; // still pending
};

export const submitConnect = async (
  roomId: RoomId,
  playerId: PlayerId,
  signullId?: SignullId, // required in free mode; ignored in round_robin
  guess?: string
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  const upperGuess = (guess || "").trim().toUpperCase();
  await runTransaction(getDb(), async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
    const data = snap.data() as FirestoreGameRoom;
    if (data.phase !== "signulls") throw new Error("INVALID_PHASE");
    const player = data.players[playerId];
    if (!player) throw new Error("PLAYER_NOT_FOUND");
    // Determine target signull
    let targetId: SignullId | undefined = signullId;
    if (data.settings.playMode === "round_robin") {
      const idx = data.signullState.activeIndex;
      if (idx === null) throw new Error("NO_ACTIVE_SIGNULL");
      targetId = data.signullState.order[idx];
    }
    if (!targetId) throw new Error("SIGNULL_ID_REQUIRED");
    const entry = data.signullState.itemsById[targetId];
    if (!entry) throw new Error("SIGNULL_NOT_FOUND");
    if (entry.status !== "pending") throw new Error("SIGNULL_NOT_PENDING");
    // Prevent duplicate from same player (unless setter)
    if (
      player.role !== "setter" &&
      entry.connects.some((c) => c.playerId === playerId)
    ) {
      throw new Error("ALREADY_CONNECTED");
    }
    const isCorrect = upperGuess === entry.word;
    const newConnect = {
      playerId,
      guess: upperGuess,
      timestamp: serverTimestamp(),
      isCorrect,
    };
    entry.connects.push(newConnect);
    // Evaluate resolution
    const resolution = evaluateResolution(entry, data);
    let newRevealedCount = data.revealedCount ?? 0;

    if (resolution) {
      entry.status = resolution.status;
      if (resolution.resolvedAt) entry.resolvedAt = resolution.resolvedAt;
      if (resolution.status === "resolved") {
        newRevealedCount++;

        // Invalidate other pending signulls if one is resolved
        // This prevents multiple signulls from being active/resolved simultaneously
        // when they were all pending at the same time.
        const otherPendingIds = data.signullState.order.filter(
          (id) =>
            id !== targetId &&
            data.signullState.itemsById[id].status === "pending"
        );

        otherPendingIds.forEach((id) => {
          const pendingEntry = data.signullState.itemsById[id];
          if (pendingEntry) {
            pendingEntry.status = "inactive";
            pendingEntry.resolvedAt = serverTimestamp();
          }
        });
      }
    }
    // Advance activeIndex for round_robin if resolved/failed/blocked
    if (
      data.settings.playMode === "round_robin" &&
      resolution &&
      ["resolved", "failed", "blocked"].includes(resolution.status)
    ) {
      const pendingIds = data.signullState.order.filter(
        (id) => data.signullState.itemsById[id].status === "pending"
      );
      if (pendingIds.length === 0) {
        data.signullState.activeIndex = null;
      } else {
        const nextId = pendingIds[0];
        data.signullState.activeIndex = data.signullState.order.indexOf(nextId);
      }
      if (resolution.gameEnded) {
        data.phase = "ended";
        data.winner = resolution.winner;
      }
    } else if (resolution?.gameEnded) {
      data.phase = "ended";
      data.winner = resolution.winner;
    }
    trx.update(docRef, {
      signullState: data.signullState,
      phase: data.phase,
      winner: data.winner,
      revealedCount: newRevealedCount,
      updatedAt: serverTimestamp(),
    });
  });
};

export const submitDirectGuess = async (
  roomId: RoomId,
  playerId: PlayerId,
  guess: string
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  const upperGuess = guess.trim().toUpperCase();
  await runTransaction(getDb(), async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
    const data = snap.data() as FirestoreGameRoom;
    if (data.phase !== "signulls") throw new Error("INVALID_PHASE");
    const player = data.players[playerId];
    if (!player || player.role !== "guesser") throw new Error("NOT_GUESSER");
    if (data.directGuessesLeft <= 0) throw new Error("NO_GUESSES_LEFT");
    const remaining = data.directGuessesLeft - 1;
    if (upperGuess === data.secretWord) {
      trx.update(docRef, {
        winner: "guessers",
        phase: "ended",
        directGuessesLeft: remaining,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    if (remaining <= 0) {
      trx.update(docRef, {
        winner: "setter",
        phase: "ended",
        directGuessesLeft: 0,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    trx.update(docRef, {
      directGuessesLeft: remaining,
      updatedAt: serverTimestamp(),
    });
  });
};

export const endGame = async (
  roomId: RoomId,
  winner: GameState["winner"]
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  await updateDoc(docRef, {
    phase: "ended",
    winner: winner,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToRoom = (
  roomId: RoomId,
  callback: (state: GameState | null, error?: GameError) => void
) => {
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
        callback(null, { code: "PARSE_ERROR", message: (e as Error).message });
      }
    },
    (err) => {
      callback(null, { code: "SUBSCRIBE_ERROR", message: err.message });
    }
  );
};

export const checkRoomExists = async (roomId: RoomId): Promise<boolean> => {
  const docRef = doc(getRoomsCollection(), roomId);
  const snap = await import("firebase/firestore").then((m) => m.getDoc(docRef));
  return snap.exists();
};

export const updateGameSettings = async (
  roomId: RoomId,
  settings: Partial<GameSettings>
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    updates[`settings.${key}`] = value;
  }
  updates.updatedAt = serverTimestamp();
  await updateDoc(docRef, updates);
};

export const changeSetter = async (
  roomId: RoomId,
  newSetterId: PlayerId
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  await runTransaction(getDb(), async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
    const data = snap.data() as FirestoreGameRoom;

    if (!data.players[newSetterId]) throw new Error("PLAYER_NOT_FOUND");

    const oldSetterId = data.setterId;

    trx.update(docRef, {
      setterId: newSetterId,
      [`players.${oldSetterId}.role`]: "guesser",
      [`players.${newSetterId}.role`]: "setter",
      updatedAt: serverTimestamp(),
    });
  });
};

export const startGame = async (roomId: RoomId): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);
  await updateDoc(docRef, {
    phase: "setting",
    updatedAt: serverTimestamp(),
  });
};
