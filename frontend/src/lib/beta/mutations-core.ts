import {
  type CollectionReference,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  increment,
} from "firebase/firestore";
import type {
  FirestoreGameRoom,
  PlayerId,
  RoomId,
  SignullId,
  FirestoreSignullEntry,
  FirestoreTimeValue,
  GameState,
  FirestoreScoreEvent,
  FirestoreGameInsight,
} from "./types";
import {
  calculateInterceptScore,
  calculateSignullResolvedScore,
  calculateFailedLightningSignullScore,
  calculateDirectGuessScore,
  calculateGameEndScore,
  mergeScoreResults,
  type ScoreResult,
} from "./scoring";

export interface MutationDeps {
  getRoomsCollection: () => CollectionReference;
}

export const generateSignullId = (): SignullId => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  return `sn_${ts}_${rand}`;
};

// Helper to compute resolution outcome
interface ResolutionResult {
  status: FirestoreSignullEntry["status"];
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
  let insightCounter = 0;
  const genId = () => {
    insightCounter += 1;
    return `insight_${Date.now()}_${insightCounter.toString(36)}`;
  };

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

  // Find pairs with mutual connects (each connected to other's signulls at least 2 times)
  const qualifyingPairs: Array<{
    p1: string;
    p2: string;
    totalConnects: number;
  }> = [];

  for (let i = 0; i < guesserIds.length; i++) {
    for (let j = i + 1; j < guesserIds.length; j++) {
      const p1 = guesserIds[i];
      const p2 = guesserIds[j];
      const p1ToP2 = mutualConnects[p1]?.[p2] || 0;
      const p2ToP1 = mutualConnects[p2]?.[p1] || 0;

      if (p1ToP2 >= 2 && p2ToP1 >= 2) {
        const totalConnects = p1ToP2 + p2ToP1;
        qualifyingPairs.push({ p1, p2, totalConnects });
      }
    }
  }

  // Find the maximum total connects among qualifying pairs
  if (qualifyingPairs.length > 0) {
    const maxConnects = Math.max(
      ...qualifyingPairs.map((pair) => pair.totalConnects)
    );

    // Add all pairs that have the maximum connects
    qualifyingPairs
      .filter((pair) => pair.totalConnects === maxConnects)
      .forEach((pair) => {
        const name1 = players[pair.p1].name;
        const name2 = players[pair.p2].name;
        insights.push({
          id: genId(),
          type: "dynamic_duo",
          playerIds: [pair.p1, pair.p2],
          title: `${name1} & ${name2} are on the same wavelength!`,
          subtitle: `Connected to each other's signulls ${pair.totalConnects} times`,
          metadata: { connects: pair.totalConnects },
          priority: 1,
        });
      });
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

    // Additional safety check to handle edge cases
    if (!longestSignull) {
      return topInsights.map(({ priority, ...insight }) => insight);
    }

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

export const setSecretWordCore = async (
  deps: MutationDeps,
  roomId: RoomId,
  setterId: PlayerId,
  word: string
): Promise<void> => {
  const docRef = doc(deps.getRoomsCollection(), roomId);
  const upper = word.trim().toUpperCase();

  if (!/^[A-Z]+$/.test(upper)) {
    throw new Error("INVALID_WORD_FORMAT");
  }

  await runTransaction(docRef.firestore, async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

    const data = snap.data() as FirestoreGameRoom;
    if (data.setterId !== setterId) throw new Error("NOT_SETTER");
    if (data.phase !== "lobby" && data.phase !== "setting") {
      throw new Error("INVALID_PHASE");
    }

    trx.update(docRef, {
      secretWord: upper,
      phase: "signulls",
      updatedAt: serverTimestamp(),
    });
  });
};

export const addSignullCore = async (
  deps: MutationDeps,
  roomId: RoomId,
  playerId: PlayerId,
  word: string,
  clue: string
): Promise<SignullId> => {
  const docRef = doc(deps.getRoomsCollection(), roomId);
  const signullId = generateSignullId();

  await runTransaction(docRef.firestore, async (trx) => {
    const snap = await trx.get(docRef);
    if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

    const data = snap.data() as FirestoreGameRoom;
    if (data.phase !== "signulls") throw new Error("INVALID_PHASE");

    const player = data.players[playerId];
    if (!player) throw new Error("PLAYER_NOT_FOUND");
    if (player.role !== "guesser") throw new Error("ONLY_GUESSER_CAN_CREATE");

    const upperWord = word.trim().toUpperCase();
    const settings = data.settings;

    if (settings.prefixMode) {
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
      createdAt: serverTimestamp(),
    };

    const currentOrder = data.signullState.order || {};
    const revealedCount = data.revealedCount ?? 0;
    const stageKey = String(revealedCount);
    const currentStageList = currentOrder[stageKey] || [];
    const newStageList = [...currentStageList, signullId];

    const newOrder = { ...currentOrder, [stageKey]: newStageList };
    const sortedKeys = Object.keys(newOrder)
      .map(Number)
      .sort((a, b) => a - b);
    const flattenedOrder = sortedKeys.reduce(
      (acc, key) => acc.concat(newOrder[String(key)]),
      [] as string[]
    );

    const activeIndex =
      settings.playMode === "round_robin" ? flattenedOrder.length - 1 : null;

    trx.update(docRef, {
      "signullState.order": newOrder,
      "signullState.activeIndex": activeIndex,
      [`signullState.itemsById.${signullId}`]: newEntry,
      updatedAt: serverTimestamp(),
    });
  });

  return signullId;
};

export const submitConnectCore = async (
  deps: MutationDeps,
  roomId: RoomId,
  playerId: PlayerId,
  signullId?: SignullId,
  guess?: string
): Promise<void> => {
  const docRef = doc(deps.getRoomsCollection(), roomId);
  const upperGuess = (guess || "").trim().toUpperCase();

  await runTransaction(docRef.firestore, async (trx) => {
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

    // Prevent guessers from connecting their own signull
    if (player.role === "guesser" && entry.playerId === playerId) {
      throw new Error("CANNOT_CONNECT_OWN_SIGNULL");
    }

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
    const firestoreScoreEvents: FirestoreScoreEvent[] = scoreResult.events.map(
      (e) => ({
        playerId: e.playerId,
        delta: e.delta,
        reason: e.reason,
        timestamp: Timestamp.now(),
        details: e.details,
      })
    );

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
      updatePayload.scoreEvents = [...existingEvents, ...firestoreScoreEvents];
    }

    // Apply score updates using atomic increment
    for (const [pid, delta] of Object.entries(scoreResult.updates)) {
      if (delta !== 0) {
        updatePayload[`players.${pid}.score`] = increment(delta);
      }
    }

    trx.update(docRef, updatePayload);
  });
};

export const submitDirectGuessCore = async (
  deps: MutationDeps,
  roomId: RoomId,
  playerId: PlayerId,
  guess: string
): Promise<void> => {
  const docRef = doc(deps.getRoomsCollection(), roomId);
  const upperGuess = guess.trim().toUpperCase();

  await runTransaction(docRef.firestore, async (trx) => {
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
};
