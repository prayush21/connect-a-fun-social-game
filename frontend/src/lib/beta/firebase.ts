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
import { useNotificationStore } from "./notification-store";
import { GameErrorMessages } from "./notifications";

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
    const docRef = doc(getRoomsCollection(), roomId);
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

    // Build players object conditionally - empty if display mode
    const players: FirestoreGameRoom["players"] = isDisplayMode
      ? {}
      : {
          [creatorId]: {
            name: username,
            role: "setter",
            isOnline: true,
            lastActive: serverTimestamp() as Timestamp,
            score: 0,
          },
        };

    const initial: FirestoreGameRoom = {
      schemaVersion: 2,
      roomId,
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
    await setDoc(docRef, initial);
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
      if (!snap.exists()) return; // no-op
      const data = snap.data() as FirestoreGameRoom;
      if (!data.players[playerId]) return;
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

      // Prefix Mode Validation
      if (data.settings.prefixMode) {
        const revealedCount = data.revealedCount ?? 0;
        const requiredPrefix = data.secretWord.slice(0, revealedCount);
        if (!upperWord.startsWith(requiredPrefix)) {
          throw new Error(`WORD_MUST_START_WITH_${requiredPrefix}`);
        }
      }

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
  } catch (error) {
    handleFirebaseError(error);
    throw error; // Should be unreachable because handleFirebaseError throws, but for TS
  }
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
  if (correctCount >= connectsRequired) {
    return {
      status: "resolved",
      gameEnded: entry.isFinal, // Lightning signull ends game
      winner: entry.isFinal ? "guessers" : data.winner,
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
      gameEnded: entry.isFinal, // Failed lightning signull ends game
      winner: entry.isFinal ? "setter" : data.winner, // Setter wins if lightning signull fails
      resolvedAt: serverTimestamp(),
    };
  }
  return null; // still pending
};

// ==================== Game Insights Computation ====================

/**
 * Compute game insights based on player performance.
 * Returns max 2 insights, sorted by priority.
 * Falls back to "longest word vibe" if no notable insights found.
 */
export const computeInsights = (
  data: FirestoreGameRoom
): FirestoreGameInsight[] => {
  const insights: (FirestoreGameInsight & { priority: number })[] = [];
  const players = data.players;
  const signulls = Object.values(data.signullState.itemsById);
  const resolvedSignulls = signulls.filter((s) => s.status === "resolved");
  const blockedSignulls = signulls.filter((s) => s.status === "blocked");

  // Helper to generate unique ID
  const genId = () =>
    `insight_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Dynamic Duo: Two players who connected to each other's signulls ≥2 times
  // Priority: 1 (highest)
  const guesserIds = Object.keys(players).filter(
    (id) => players[id].role === "guesser"
  );
  const mutualConnects: Record<string, Record<string, number>> = {};

  for (const signull of signulls) {
    const creatorId = signull.playerId;
    if (!mutualConnects[creatorId]) mutualConnects[creatorId] = {};

    for (const connect of signull.connects) {
      const connecterId = connect.playerId;
      // Only count correct connects from guessers
      if (
        connect.isCorrect &&
        players[connecterId]?.role === "guesser" &&
        connecterId !== creatorId
      ) {
        mutualConnects[creatorId][connecterId] =
          (mutualConnects[creatorId][connecterId] || 0) + 1;
      }
    }
  }

  // Find pairs who connected to each other's signulls at least 2 times each
  for (let i = 0; i < guesserIds.length; i++) {
    for (let j = i + 1; j < guesserIds.length; j++) {
      const p1 = guesserIds[i];
      const p2 = guesserIds[j];
      const p1ToP2 = mutualConnects[p1]?.[p2] || 0;
      const p2ToP1 = mutualConnects[p2]?.[p1] || 0;

      if (p1ToP2 >= 2 && p2ToP1 >= 2) {
        const name1 = players[p1].name;
        const name2 = players[p2].name;
        const totalConnects = p1ToP2 + p2ToP1;
        insights.push({
          id: genId(),
          type: "dynamic_duo",
          playerIds: [p1, p2],
          title: `${name1} & ${name2} are on the same wavelength!`,
          subtitle: `Connected to each other's signulls ${totalConnects} times`,
          metadata: { connects: totalConnects },
          priority: 1,
        });
      }
    }
  }

  // 2. OG Interceptor: Setter who intercepted ≥70% of signulls
  // Priority: 2
  if (signulls.length >= 3) {
    const interceptRate = blockedSignulls.length / signulls.length;
    if (interceptRate >= 0.7) {
      const setterId = data.setterId;
      const setterName = players[setterId]?.name || "Setter";
      insights.push({
        id: genId(),
        type: "og_interceptor",
        playerIds: [setterId],
        title: `${setterName} is the OG Interceptor!`,
        subtitle: `Blocked ${Math.round(interceptRate * 100)}% of all signulls`,
        metadata: { percentage: Math.round(interceptRate * 100) },
        priority: 2,
      });
    }
  }

  // 3. Signull Machine: Player who created ≥50% of resolved signulls
  // Priority: 3
  if (resolvedSignulls.length >= 2) {
    const creatorCounts: Record<string, number> = {};
    for (const signull of resolvedSignulls) {
      creatorCounts[signull.playerId] =
        (creatorCounts[signull.playerId] || 0) + 1;
    }

    for (const [playerId, count] of Object.entries(creatorCounts)) {
      const percentage = count / resolvedSignulls.length;
      if (percentage >= 0.5) {
        const playerName = players[playerId]?.name || "Player";
        insights.push({
          id: genId(),
          type: "signull_machine",
          playerIds: [playerId],
          title: `${playerName} is a Signull Machine!`,
          subtitle: `Created ${count} of ${resolvedSignulls.length} resolved signulls`,
          metadata: {
            count,
            total: resolvedSignulls.length,
            percentage: Math.round(percentage * 100),
          },
          priority: 3,
        });
        break; // Only one signull machine
      }
    }
  }

  // 4. Knows-It-All: Player with ≥70% correct connect rate (min 3 connects)
  // Priority: 4
  const playerConnectStats: Record<string, { correct: number; total: number }> =
    {};

  for (const signull of signulls) {
    for (const connect of signull.connects) {
      const pid = connect.playerId;
      if (players[pid]?.role === "guesser" && pid !== signull.playerId) {
        if (!playerConnectStats[pid])
          playerConnectStats[pid] = { correct: 0, total: 0 };
        playerConnectStats[pid].total++;
        if (connect.isCorrect) playerConnectStats[pid].correct++;
      }
    }
  }

  for (const [playerId, stats] of Object.entries(playerConnectStats)) {
    if (stats.total >= 3) {
      const rate = stats.correct / stats.total;
      if (rate >= 0.7) {
        const playerName = players[playerId]?.name || "Player";
        insights.push({
          id: genId(),
          type: "knows_it_all",
          playerIds: [playerId],
          title: `${playerName} knows-it-all!`,
          subtitle: `Connected correctly ${Math.round(rate * 100)}% of the time`,
          metadata: {
            percentage: Math.round(rate * 100),
            correct: stats.correct,
            total: stats.total,
          },
          priority: 4,
        });
        break; // Only one knows-it-all
      }
    }
  }

  // Sort by priority and take top 2
  insights.sort((a, b) => a.priority - b.priority);
  const topInsights = insights.slice(0, 2);

  // 5. Fallback: Longest Word Vibe (if we have less than 2 insights)
  // Priority: 5 (lowest, always last)
  if (topInsights.length < 2 && resolvedSignulls.length > 0) {
    // Find the longest word from resolved signulls
    let longestSignull = resolvedSignulls[0];
    for (const signull of resolvedSignulls) {
      if (signull.word.length > longestSignull.word.length) {
        longestSignull = signull;
      }
    }

    const creatorName = players[longestSignull.playerId]?.name || "Someone";
    const word = longestSignull.word;

    topInsights.push({
      id: genId(),
      type: "longest_word_vibe",
      playerIds: [longestSignull.playerId],
      title: `${creatorName} made everyone vibe on "${word}"!`,
      subtitle: `That's a ${word.length}-letter connection. Crazy!`,
      metadata: { word, length: word.length },
      priority: 5,
    });
  }

  // Remove priority field before returning
  return topInsights.map(({ priority, ...insight }) => insight);
};

export const submitConnect = async (
  roomId: RoomId,
  playerId: PlayerId,
  signullId?: SignullId, // if provided, targets specific signull; in round_robin falls back to activeIndex if not provided
  guess?: string
): Promise<void> => {
  try {
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
      let scoreResult: ScoreResult = { updates: {}, events: [] };

      // Award points for setter intercept only
      // Guessers don't get immediate points - they'll get +5 when signull resolves
      if (isCorrect && player.role === "setter") {
        // Setter intercepted the signull
        scoreResult = mergeScoreResults(
          scoreResult,
          calculateInterceptScore(playerId, targetId)
        );
      }

      // Evaluate resolution
      const resolution = evaluateResolution(entry, data);
      let newRevealedCount = data.revealedCount ?? 0;

      if (resolution) {
        entry.status = resolution.status;
        if (resolution.resolvedAt) entry.resolvedAt = resolution.resolvedAt;
        if (resolution.status === "resolved") {
          newRevealedCount++;

          // Check if all letters are revealed - guessers win!
          if (newRevealedCount >= data.secretWord.length) {
            data.phase = "ended";
            data.winner = "guessers";
            resolution.gameEnded = true;
            resolution.winner = "guessers";
          }

          // Award points for signull being resolved
          scoreResult = mergeScoreResults(
            scoreResult,
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
        } else if (resolution.status === "failed") {
          // Award points for failed lightning signull
          // (creator and correct connectors get bonus points)
          scoreResult = mergeScoreResults(
            scoreResult,
            calculateFailedLightningSignullScore(entry, data)
          );
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
        scoreResult = mergeScoreResults(
          scoreResult,
          calculateGameEndScore(data, resolution.winner)
        );
      }

      // Convert score events to Firestore format
      // Note: Using Timestamp.now() because serverTimestamp() is not supported inside arrays
      const firestoreScoreEvents: FirestoreScoreEvent[] =
        scoreResult.events.map((e) => ({
          playerId: e.playerId,
          delta: e.delta,
          reason: e.reason,
          timestamp: Timestamp.now(),
          details: e.details,
        }));

      // Build the update object with score increments
      const updatePayload: Record<string, unknown> = {
        signullState: data.signullState,
        phase: data.phase,
        winner: data.winner ?? null,
        revealedCount: newRevealedCount,
        updatedAt: serverTimestamp(),
      };

      // Compute and store insights if game ended
      if (resolution?.gameEnded) {
        updatePayload.insights = computeInsights(data);
      }

      // Append score events to existing array
      if (firestoreScoreEvents.length > 0) {
        const existingEvents = data.scoreEvents || [];
        updatePayload.scoreEvents = [
          ...existingEvents,
          ...firestoreScoreEvents,
        ];
      }

      // Apply score updates using atomic increment
      for (const [pid, delta] of Object.entries(scoreResult.updates)) {
        if (delta !== 0) {
          updatePayload[`players.${pid}.score`] = increment(delta);
        }
      }

      trx.update(docRef, updatePayload);
    });
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
      let scoreResult: ScoreResult = calculateDirectGuessScore(
        playerId,
        isCorrect,
        data,
        upperGuess
      );

      // Helper to convert events to Firestore format and build update payload
      const buildUpdatePayload = (
        basePayload: Record<string, unknown>,
        result: ScoreResult
      ): Record<string, unknown> => {
        const payload = { ...basePayload };

        // Convert score events to Firestore format
        // Note: Using Timestamp.now() because serverTimestamp() is not supported inside arrays
        const firestoreScoreEvents: FirestoreScoreEvent[] = result.events.map(
          (e) => ({
            playerId: e.playerId,
            delta: e.delta,
            reason: e.reason,
            timestamp: Timestamp.now(),
            details: e.details,
          })
        );

        // Append score events to existing array
        if (firestoreScoreEvents.length > 0) {
          const existingEvents = data.scoreEvents || [];
          payload.scoreEvents = [...existingEvents, ...firestoreScoreEvents];
        }

        // Apply score updates using atomic increment
        for (const [pid, delta] of Object.entries(result.updates)) {
          if (delta !== 0) {
            payload[`players.${pid}.score`] = increment(delta);
          }
        }

        return payload;
      };

      if (isCorrect) {
        // Calculate game end scores for guessers winning
        scoreResult = mergeScoreResults(
          scoreResult,
          calculateGameEndScore(data, "guessers")
        );

        const updatePayload = buildUpdatePayload(
          {
            winner: "guessers",
            phase: "ended",
            directGuessesLeft: remaining,
            lastDirectGuess,
            insights: computeInsights(data),
            updatedAt: serverTimestamp(),
          },
          scoreResult
        );

        trx.update(docRef, updatePayload);
      } else {
        // Wrong guess
        if (remaining <= 0) {
          // Out of guesses - setter wins!
          scoreResult = mergeScoreResults(
            scoreResult,
            calculateGameEndScore(data, "setter")
          );

          const updatePayload = buildUpdatePayload(
            {
              winner: "setter",
              phase: "ended",
              insights: computeInsights(data),
              directGuessesLeft: 0,
              lastDirectGuess,
              updatedAt: serverTimestamp(),
            },
            scoreResult
          );

          trx.update(docRef, updatePayload);
        } else {
          // Still have guesses remaining
          const updatePayload = buildUpdatePayload(
            {
              directGuessesLeft: remaining,
              lastDirectGuess,
              updatedAt: serverTimestamp(),
            },
            scoreResult
          );

          trx.update(docRef, updatePayload);
        }
      }
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const endGame = async (
  roomId: RoomId,
  winner: GameState["winner"]
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    await updateDoc(docRef, {
      phase: "ended",
      winner: winner,
      updatedAt: serverTimestamp(),
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
  settings: Partial<GameSettings>
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      updates[`settings.${key}`] = value;
    }
    updates.updatedAt = serverTimestamp();
    await updateDoc(docRef, updates);
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

export const startGame = async (roomId: RoomId): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    await updateDoc(docRef, {
      phase: "setting",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};

// Start a new round while keeping existing scores intact
export const playAgain = async (roomId: RoomId): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);

    await updateDoc(docRef, {
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
  } catch (error) {
    handleFirebaseError(error);
  }
};

export const backToLobby = async (
  roomId: RoomId,
  resetScores: boolean = false
): Promise<void> => {
  try {
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
          scoreEvents: [], // Clear score events
          scoreCountingComplete: false,
          insights: [], // Clear insights
          updatedAt: serverTimestamp(),
        };

        // Reset scores for all players
        Object.keys(data.players).forEach((pid) => {
          updates[`players.${pid}.score`] = 0;
        });

        trx.update(docRef, updates);
      });
    } else {
      // Just reset game state, keep scores
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
        scoreEvents: [], // Clear score events
        scoreCountingComplete: false,
        insights: [], // Clear insights
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirebaseError(error);
  }
};

/**
 * Reset only player scores without affecting game state.
 * Can be called from lobby to reset scores before starting a new game.
 */
export const resetScoresOnly = async (roomId: RoomId): Promise<void> => {
  try {
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
    await updateDoc(docRef, {
      scoreCountingComplete: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};
