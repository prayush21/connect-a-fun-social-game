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
  ScoreEvent,
  FirestoreScoreEvent,
  GameInsight,
  FirestoreGameInsight,
  InsightType,
} from "./types";
import {
  calculateCorrectSignullGuessScore,
  calculateInterceptScore,
  calculateSignullResolvedScore,
  calculateFailedLightningSignullScore,
  calculateDirectGuessScore,
  calculateGameEndScore,
  mergeScoreResults,
  ScoreResult,
} from "./scoring";
import {
  addSignullCore,
  submitConnectCore,
  submitDirectGuessCore,
  setSecretWordCore,
} from "./mutations-core";
import { useNotificationStore } from "./notification-store";
import { GameErrorMessages } from "./notifications";

export {
  evaluateResolution,
  computeInsights,
  generateSignullId,
} from "./mutations-core";

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

const handleFirebaseError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  let userMessage = GameErrorMessages[message] || message;

  // Handle dynamic error messages
  if (message.startsWith("WORD_MUST_START_WITH_")) {
    const prefix = message.replace("WORD_MUST_START_WITH_", "");
    userMessage = `Word must start with ${prefix}`;
  }

  useNotificationStore.getState().addNotification({
    category: "error",
    priority: "high",
    message: userMessage,
    autoDismissMs: 4000,
  });

  throw error;
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
    hostId: data.hostId ?? null,
    isDisplayMode: data.isDisplayMode ?? false,
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
    settings: {
      ...data.settings,
      showScoreBreakdown: data.settings.showScoreBreakdown ?? false,
      displaySoundMode: data.settings.displaySoundMode ?? true,
    },
    scoreEvents: (data.scoreEvents || []).map((e) => ({
      playerId: e.playerId,
      delta: e.delta,
      reason: e.reason,
      timestamp: tsToDate(e.timestamp),
      details: e.details,
    })),
    scoreCountingComplete: data.scoreCountingComplete ?? false,
    insights: (data.insights || []).map((i) => ({
      id: i.id,
      type: i.type,
      playerIds: i.playerIds,
      title: i.title,
      subtitle: i.subtitle,
      metadata: i.metadata,
    })),
    createdAt: tsToDate(data.createdAt),
    updatedAt: tsToDate(data.updatedAt),
  };
};

// ---------------- Core Firestore Operations ----------------

export const createRoom = async (
  roomId: RoomId,
  creatorId: PlayerId,
  username: string,
  settings?: Partial<GameSettings>,
  isDisplayMode: boolean = false
): Promise<void> => {
  try {
    // Validate inputs
    const trimmedUsername = username.trim();
    const trimmedRoomId = roomId.trim().toUpperCase();

    if (trimmedRoomId.length !== 6 || !/^[A-Z0-9]+$/.test(trimmedRoomId)) {
      throw new Error("INVALID_ROOM_ID");
    }

    if (!isDisplayMode) {
      if (
        trimmedUsername.length < 2 ||
        trimmedUsername.length > 20 ||
        !/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)
      ) {
        throw new Error("INVALID_USERNAME");
      }
    }

    const docRef = doc(getRoomsCollection(), trimmedRoomId);
    const finalSettings: GameSettings = {
      playMode: settings?.playMode || "round_robin",
      connectsRequired: settings?.connectsRequired || 2,
      maxPlayers: settings?.maxPlayers || 8,
      timeLimitSeconds: settings?.timeLimitSeconds || 30,
      wordValidation: settings?.wordValidation || "strict",
      prefixMode: settings?.prefixMode ?? true, // Default to true for new games
      showScoreBreakdown: settings?.showScoreBreakdown ?? true, // Default to true for new games
      displaySoundMode: settings?.displaySoundMode ?? true, // Default to true for new games
    };

    // Use transaction to check room doesn't already exist
    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (snap.exists()) {
        throw new Error("ROOM_ALREADY_EXISTS");
      }

      // Build players object conditionally - empty if display mode
      const players: FirestoreGameRoom["players"] = isDisplayMode
        ? {}
        : {
            [creatorId]: {
              name: trimmedUsername,
              role: "setter",
              isOnline: true,
              lastActive: serverTimestamp() as Timestamp,
              score: 0,
            },
          };

      const initial: FirestoreGameRoom = {
        schemaVersion: 2,
        roomId: trimmedRoomId,
        phase: "lobby",
        players,
        hostId: isDisplayMode ? null : creatorId,
        isDisplayMode,
        setterId: isDisplayMode ? "" : creatorId,
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
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };
      trx.set(docRef, initial);
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const joinRoom = async (
  roomId: RoomId,
  playerId: PlayerId,
  username: string
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;
      if (!["lobby", "setting", "signulls"].includes(data.phase)) {
        throw new Error("INVALID_PHASE");
      }

      if (data.players[playerId]) {
        trx.update(docRef, {
          [`players.${playerId}.isOnline`]: true,
          [`players.${playerId}.lastActive`]: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }
      if (Object.keys(data.players).length >= data.settings.maxPlayers) {
        throw new Error("ROOM_FULL");
      }

      // Check if this is the first player (becomes host)
      const isFirstPlayer = Object.keys(data.players).length === 0;
      const shouldBecomeHost = !data.hostId || isFirstPlayer;

      const updates: Record<string, unknown> = {
        [`players.${playerId}`]: {
          name: username,
          role: shouldBecomeHost ? "setter" : "guesser",
          isOnline: true,
          lastActive: serverTimestamp(),
          score: 0,
        },
        updatedAt: serverTimestamp(),
      };

      // Assign host and setter if first player
      if (shouldBecomeHost) {
        updates.hostId = playerId;
        updates.setterId = playerId;
      }

      trx.update(docRef, updates);
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const leaveRoom = async (
  roomId: RoomId,
  playerId: PlayerId
): Promise<void> => {
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

      // Transfer host to next player if leaving player is host
      if (isHost && remainingIds.length > 0) {
        updates.hostId = remainingIds[0];
      } else if (isHost && remainingIds.length === 0) {
        updates.hostId = null;
      }

      // Transfer setter role if leaving player is setter
      if (isSetter && remainingIds.length > 0) {
        updates.setterId = remainingIds[0];
        updates[`players.${remainingIds[0]}.role`] = "setter";
      } else if (isSetter && remainingIds.length === 0) {
        updates.setterId = null;
      }
      trx.update(docRef, updates);
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const setSecretWord = async (
  roomId: RoomId,
  setterId: PlayerId,
  word: string
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    const upper = word.trim().toUpperCase();

    // Validate that word contains only alphabets
    if (!/^[A-Z]+$/.test(upper)) {
      throw new Error("INVALID_WORD_FORMAT");
    }

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
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const addSignull = async (
  roomId: RoomId,
  playerId: PlayerId,
  word: string,
  clue: string
): Promise<SignullId> => {
  try {
    return await addSignullCore(
      { getRoomsCollection },
      roomId,
      playerId,
      word,
      clue
    );
  } catch (error) {
    handleFirebaseError(error);
    throw error; // Should be unreachable because handleFirebaseError throws, but for TS
  }
};

export const submitConnect = async (
  roomId: RoomId,
  playerId: PlayerId,
  signullId?: SignullId, // if provided, targets specific signull; in round_robin falls back to activeIndex if not provided
  guess?: string
): Promise<void> => {
  try {
    await submitConnectCore(
      { getRoomsCollection },
      roomId,
      playerId,
      signullId,
      guess
    );
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const submitDirectGuess = async (
  roomId: RoomId,
  playerId: PlayerId,
  guess: string
): Promise<void> => {
  try {
    await submitDirectGuessCore(
      { getRoomsCollection },
      roomId,
      playerId,
      guess
    );
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const endGame = async (
  roomId: RoomId,
  requesterId: PlayerId,
  winner: GameState["winner"]
): Promise<void> => {
  try {
    // Validate winner value
    if (winner !== "guessers" && winner !== "setter" && winner !== null) {
      throw new Error("INVALID_WINNER");
    }

    const docRef = doc(getRoomsCollection(), roomId);

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      // Check role: only host can end game
      if (data.hostId !== requesterId) {
        throw new Error("NOT_HOST");
      }

      trx.update(docRef, {
        phase: "ended",
        winner: winner,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirebaseError(error);
  }
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
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    const snap = await import("firebase/firestore").then((m) =>
      m.getDoc(docRef)
    );
    return snap.exists();
  } catch (error) {
    // Don't notify for checkRoomExists as it might be used for validation
    throw error;
  }
};

export const updateGameSettings = async (
  roomId: RoomId,
  requesterId: PlayerId,
  settings: Partial<GameSettings>
): Promise<void> => {
  try {
    // Whitelist of allowed settings keys
    const allowedKeys: (keyof GameSettings)[] = [
      "playMode",
      "connectsRequired",
      "maxPlayers",
      "timeLimitSeconds",
      "wordValidation",
      "prefixMode",
      "displaySoundMode",
      "showScoreBreakdown",
    ];

    const docRef = doc(getRoomsCollection(), roomId);

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      // Check role: only host can update settings
      if (data.hostId !== requesterId) {
        throw new Error("NOT_HOST");
      }

      // Check phase: lobby or setting
      if (data.phase !== "lobby" && data.phase !== "setting") {
        throw new Error("INVALID_PHASE");
      }

      // Build updates with only whitelisted keys
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (allowedKeys.includes(key as keyof GameSettings)) {
          updates[`settings.${key}`] = value;
        }
      }
      updates.updatedAt = serverTimestamp();

      trx.update(docRef, updates);
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const updatePlayerName = async (
  roomId: RoomId,
  playerId: PlayerId,
  newName: string
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) {
        throw new Error("ROOM_NOT_FOUND");
      }
      const data = snap.data() as FirestoreGameRoom;
      if (!data.players[playerId]) {
        throw new Error("PLAYER_NOT_FOUND");
      }
      const trimmedName = newName.trim();
      if (!trimmedName) {
        throw new Error("INVALID_NAME");
      }
      trx.update(docRef, {
        [`players.${playerId}.name`]: trimmedName,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const changeSetter = async (
  roomId: RoomId,
  newSetterId: PlayerId,
  requesterId: PlayerId
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      // Check phase: lobby or setting
      if (data.phase !== "lobby" && data.phase !== "setting") {
        throw new Error("INVALID_PHASE");
      }

      // Only host can change setter
      if (data.hostId !== requesterId) {
        throw new Error("ONLY_HOST_CAN_CHANGE_SETTER");
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
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const startGame = async (
  roomId: RoomId,
  requesterId: PlayerId
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      // Check phase
      if (data.phase !== "lobby") {
        throw new Error("INVALID_PHASE");
      }

      // Check role: host or setter can start
      if (data.hostId !== requesterId && data.setterId !== requesterId) {
        throw new Error("NOT_HOST_OR_SETTER");
      }

      trx.update(docRef, {
        phase: "setting",
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

// Start a new round while keeping existing scores intact
export const playAgain = async (
  roomId: RoomId,
  requesterId: PlayerId
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      // Check phase
      if (data.phase !== "ended") {
        throw new Error("INVALID_PHASE");
      }

      // Check role: only host can play again
      if (data.hostId !== requesterId) {
        throw new Error("NOT_HOST");
      }

      trx.update(docRef, {
        phase: "setting",
        secretWord: deleteField(),
        revealedCount: 0,
        "signullState.order": {},
        "signullState.itemsById": {},
        "signullState.activeIndex": null,
        directGuessesLeft: 3,
        lastDirectGuess: null,
        winner: deleteField(),
        scoreEvents: [], // Clear score events for new round
        scoreCountingComplete: false,
        insights: [], // Clear insights for new round
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const backToLobby = async (
  roomId: RoomId,
  requesterId: PlayerId,
  resetScores: boolean = false
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      // Check phase
      if (data.phase !== "ended") {
        throw new Error("INVALID_PHASE");
      }

      // Check role: only host can go back to lobby
      if (data.hostId !== requesterId) {
        throw new Error("NOT_HOST");
      }

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
        scoreEvents: [], // Clear score events
        scoreCountingComplete: false,
        insights: [], // Clear insights
        updatedAt: serverTimestamp(),
      };

      // Reset scores for all players if requested
      if (resetScores) {
        Object.keys(data.players).forEach((pid) => {
          updates[`players.${pid}.score`] = 0;
        });
      }

      trx.update(docRef, updates);
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

/**
 * Reset only player scores without affecting game state.
 * Can be called from lobby to reset scores before starting a new game.
 */
export const resetScoresOnly = async (
  roomId: RoomId,
  requesterId: PlayerId
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      // Check phase: only lobby
      if (data.phase !== "lobby") {
        throw new Error("INVALID_PHASE");
      }

      // Check role: only host can reset scores
      if (data.hostId !== requesterId) {
        throw new Error("NOT_HOST");
      }

      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      // Reset all player scores to 0
      for (const playerId of Object.keys(data.players)) {
        updates[`players.${playerId}.score`] = 0;
      }

      trx.update(docRef, updates);
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

/**
 * Mark score counting animation as complete.
 * Called by display mode after finishing the score breakdown animation.
 */
export const setScoreCountingComplete = async (
  roomId: RoomId
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");
      const data = snap.data() as FirestoreGameRoom;

      // Check phase: only ended
      if (data.phase !== "ended") {
        throw new Error("INVALID_PHASE");
      }

      trx.update(docRef, {
        scoreCountingComplete: true,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};
