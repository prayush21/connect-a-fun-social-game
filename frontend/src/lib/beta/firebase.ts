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
  increment,
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
  ScoreUpdates,
} from "./types";
import {
  calculateCorrectSignullGuessScore,
  calculateInterceptScore,
  calculateSignullResolvedScore,
  calculateDirectGuessScore,
  calculateGameEndScore,
  mergeScoreUpdates,
} from "./scoring";

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
      order: data.signullState.order || {},
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
    lastDirectGuess: data.lastDirectGuess
      ? {
          playerId: data.lastDirectGuess.playerId,
          playerName: data.lastDirectGuess.playerName,
          word: data.lastDirectGuess.word,
          timestamp: tsToDate(data.lastDirectGuess.timestamp),
        }
      : null,
    winner: data.winner ?? null,
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
      order: {},
      activeIndex: finalSettings.playMode === "round_robin" ? 0 : null,
      itemsById: {},
    },
    directGuessesLeft: 3,
    lastDirectGuess: null,
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

    const currentOrder = data.signullState.order || {};
    const revealedCount = data.revealedCount ?? 0;
    const stageKey = String(revealedCount);
    const currentStageList = currentOrder[stageKey] || [];
    const newStageList = [...currentStageList, signullId];

    // Calculate flattened order for activeIndex
    const newOrder = { ...currentOrder, [stageKey]: newStageList };
    const sortedKeys = Object.keys(newOrder)
      .map(Number)
      .sort((a, b) => a - b);
    const flattenedOrder = sortedKeys.reduce(
      (acc, key) => acc.concat(newOrder[String(key)]),
      [] as string[]
    );

    const activeIndex =
      playMode === "round_robin" ? flattenedOrder.length - 1 : null;

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
  // Exclude the signull creator from the "all guessers attempted" check
  const eligibleGuesserIds = guesserIds.filter((gid) => gid !== entry.playerId);
  const allGuessersAttempted = eligibleGuesserIds.every((gid) =>
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
  signullId?: SignullId, // if provided, targets specific signull; in round_robin falls back to activeIndex if not provided
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

    // Helper to flatten order
    const getFlattenedOrder = (order: Record<string, SignullId[]>) => {
      const keys = Object.keys(order || {})
        .map(Number)
        .sort((a, b) => a - b);
      return keys.reduce(
        (acc, key) => acc.concat(order[String(key)]),
        [] as SignullId[]
      );
    };

    // Determine target signull
    // Use the explicitly passed signullId if provided, otherwise fall back to activeIndex in round_robin mode
    let targetId: SignullId | undefined = signullId;
    if (!targetId && data.settings.playMode === "round_robin") {
      const idx = data.signullState.activeIndex;
      if (idx === null) throw new Error("NO_ACTIVE_SIGNULL");
      const flattenedOrder = getFlattenedOrder(data.signullState.order);
      targetId = flattenedOrder[idx];
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
      timestamp: Timestamp.now(),
      isCorrect,
    };
    entry.connects.push(newConnect);

    // ==================== Scoring Logic ====================
    let scoreUpdates: ScoreUpdates = {};

    // Award points for correct guess on signull
    if (isCorrect) {
      if (player.role === "setter") {
        // Setter intercepted the signull
        scoreUpdates = mergeScoreUpdates(
          scoreUpdates,
          calculateInterceptScore(playerId)
        );
      } else {
        // Guesser made a correct guess
        scoreUpdates = mergeScoreUpdates(
          scoreUpdates,
          calculateCorrectSignullGuessScore(playerId)
        );
      }
    }

    // Evaluate resolution
    const resolution = evaluateResolution(entry, data);
    let newRevealedCount = data.revealedCount ?? 0;

    if (resolution) {
      entry.status = resolution.status;
      if (resolution.resolvedAt) entry.resolvedAt = resolution.resolvedAt;
      if (resolution.status === "resolved") {
        newRevealedCount++;

        // Award points for signull being resolved
        scoreUpdates = mergeScoreUpdates(
          scoreUpdates,
          calculateSignullResolvedScore(entry, data)
        );

        // Invalidate other pending signulls if one is resolved
        // This prevents multiple signulls from being active/resolved simultaneously
        // when they were all pending at the same time.
        const flattenedOrder = getFlattenedOrder(data.signullState.order);
        const otherPendingIds = flattenedOrder.filter(
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
      const flattenedOrder = getFlattenedOrder(data.signullState.order);
      const pendingIds = flattenedOrder.filter(
        (id) => data.signullState.itemsById[id].status === "pending"
      );
      if (pendingIds.length === 0) {
        data.signullState.activeIndex = null;
      } else {
        const nextId = pendingIds[0];
        data.signullState.activeIndex = flattenedOrder.indexOf(nextId);
      }
      if (resolution.gameEnded) {
        data.phase = "ended";
        data.winner = resolution.winner;
      }
    } else if (resolution?.gameEnded) {
      data.phase = "ended";
      data.winner = resolution.winner;
    }

    // Calculate game end scores if the game ended
    if (resolution?.gameEnded && resolution.winner) {
      scoreUpdates = mergeScoreUpdates(
        scoreUpdates,
        calculateGameEndScore(data, resolution.winner)
      );
    }

    // Build the update object with score increments
    const updatePayload: Record<string, unknown> = {
      signullState: data.signullState,
      phase: data.phase,
      winner: data.winner ?? null,
      revealedCount: newRevealedCount,
      updatedAt: serverTimestamp(),
    };

    // Apply score updates using atomic increment
    for (const [pid, delta] of Object.entries(scoreUpdates)) {
      if (delta !== 0) {
        updatePayload[`players.${pid}.score`] = increment(delta);
      }
    }

    trx.update(docRef, updatePayload);
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
    const lastDirectGuess = {
      playerId,
      playerName: player.name,
      word: upperGuess,
      timestamp: serverTimestamp(),
    };

    const isCorrect = upperGuess === data.secretWord;

    // Calculate direct guess score (bonus/penalty based on remaining letters)
    let scoreUpdates: ScoreUpdates = calculateDirectGuessScore(
      playerId,
      isCorrect,
      data
    );

    if (isCorrect) {
      // Calculate game end scores for guessers winning
      scoreUpdates = mergeScoreUpdates(
        scoreUpdates,
        calculateGameEndScore(data, "guessers")
      );

      // Build update payload with score increments
      const updatePayload: Record<string, unknown> = {
        winner: "guessers",
        phase: "ended",
        directGuessesLeft: remaining,
        lastDirectGuess,
        updatedAt: serverTimestamp(),
      };

      for (const [pid, delta] of Object.entries(scoreUpdates)) {
        if (delta !== 0) {
          updatePayload[`players.${pid}.score`] = increment(delta);
        }
      }

      trx.update(docRef, updatePayload);
      return;
    }

    // Wrong guess
    if (remaining <= 0) {
      // Setter wins - no more direct guesses
      scoreUpdates = mergeScoreUpdates(
        scoreUpdates,
        calculateGameEndScore(data, "setter")
      );

      const updatePayload: Record<string, unknown> = {
        winner: "setter",
        phase: "ended",
        directGuessesLeft: 0,
        lastDirectGuess,
        updatedAt: serverTimestamp(),
      };

      for (const [pid, delta] of Object.entries(scoreUpdates)) {
        if (delta !== 0) {
          updatePayload[`players.${pid}.score`] = increment(delta);
        }
      }

      trx.update(docRef, updatePayload);
      return;
    }

    // Wrong guess but still have guesses left
    const updatePayload: Record<string, unknown> = {
      directGuessesLeft: remaining,
      lastDirectGuess,
      updatedAt: serverTimestamp(),
    };

    for (const [pid, delta] of Object.entries(scoreUpdates)) {
      if (delta !== 0) {
        updatePayload[`players.${pid}.score`] = increment(delta);
      }
    }

    trx.update(docRef, updatePayload);
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

export const resetGame = async (
  roomId: RoomId,
  resetScores: boolean = false
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);

  if (resetScores) {
    // Use transaction to reset all player scores
    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      const updates: Record<string, unknown> = {
        phase: "lobby",
        secretWord: deleteField(),
        revealedCount: 0,
        "signullState.order": {},
        "signullState.itemsById": {},
        "signullState.activeIndex": null,
        directGuessesLeft: 3,
        lastDirectGuess: null,
        winner: deleteField(),
        updatedAt: serverTimestamp(),
      };

      // Reset all player scores to 0
      for (const playerId of Object.keys(data.players)) {
        updates[`players.${playerId}.score`] = 0;
      }

      trx.update(docRef, updates);
    });
  } else {
    // Simple update without score reset
    await updateDoc(docRef, {
      phase: "lobby",
      secretWord: deleteField(),
      revealedCount: 0,
      "signullState.order": {},
      "signullState.itemsById": {},
      "signullState.activeIndex": null,
      directGuessesLeft: 3,
      lastDirectGuess: null,
      winner: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }
};

/**
 * Reset only player scores without affecting game state.
 * Can be called from lobby to reset scores before starting a new game.
 */
export const resetScoresOnly = async (roomId: RoomId): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);

  await runTransaction(getDb(), async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
    const data = snap.data() as FirestoreGameRoom;

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    // Reset all player scores to 0
    for (const playerId of Object.keys(data.players)) {
      updates[`players.${playerId}.score`] = 0;
    }

    trx.update(docRef, updates);
  });
};
