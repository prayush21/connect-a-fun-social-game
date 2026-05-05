import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Transaction,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "../../firebase/config";
import type {
  FirestoreTimeValue,
  FirestoreGameRoom,
  FirestoreScoreEvent,
  FirestoreSignullEntry,
  GamePhase,
  GameSettings,
  PlayerId,
  RoomId,
  SignullId,
  SignullStatus,
} from "../types";
import {
  calculateFailedLightningSignullScore,
  calculateGameEndScore,
  calculateInterceptScore,
  calculateSignullResolvedScore,
  mergeScoreResults,
  type ScoreResult,
} from "../scoring";
import {
  composeV3GameState,
  type V3ComposedGameState,
} from "./composeGameState";
import type {
  FirestoreV3PlayerDoc,
  FirestoreV3RoomDoc,
  FirestoreV3RoundDoc,
  FirestoreV3ScoreEventDoc,
  FirestoreV3SignullDoc,
  RoundId,
  V3PlayerDoc,
  V3RoomDoc,
  V3RoundDoc,
  V3ScoreEventDoc,
  V3SignullDoc,
} from "./types";

const V3_ROOMS_COLLECTION = "rooms_v3";
const DIRECT_GUESSES_PER_ROUND = 3;

export const DEFAULT_V3_GAME_SETTINGS: GameSettings = {
  playMode: "round_robin",
  connectsRequired: 2,
  maxPlayers: 8,
  timeLimitSeconds: 30,
  wordValidation: "strict",
  prefixMode: true,
  displaySoundMode: true,
  showScoreBreakdown: true,
};

const applySettings = (settings?: Partial<GameSettings>): GameSettings => ({
  ...DEFAULT_V3_GAME_SETTINGS,
  ...settings,
});

const toFirestoreTime = () => serverTimestamp() as FirestoreTimeValue;

const tsToDate = (time: FirestoreTimeValue | null | undefined): Date | null => {
  if (!time) return null;
  if (time instanceof Timestamp) return time.toDate();
  if (
    typeof time === "object" &&
    "toDate" in time &&
    typeof time.toDate === "function"
  ) {
    return time.toDate();
  }
  return new Date();
};

const roomRef = (roomId: RoomId) => doc(getDb(), V3_ROOMS_COLLECTION, roomId);
const playersRef = (roomId: RoomId) =>
  collection(getDb(), V3_ROOMS_COLLECTION, roomId, "players");
const playerRef = (roomId: RoomId, playerId: PlayerId) =>
  doc(getDb(), V3_ROOMS_COLLECTION, roomId, "players", playerId);
const roundsRef = (roomId: RoomId) =>
  collection(getDb(), V3_ROOMS_COLLECTION, roomId, "rounds");
const roundRef = (roomId: RoomId, roundId: RoundId) =>
  doc(getDb(), V3_ROOMS_COLLECTION, roomId, "rounds", roundId);
const signullsRef = (roomId: RoomId, roundId: RoundId) =>
  collection(
    getDb(),
    V3_ROOMS_COLLECTION,
    roomId,
    "rounds",
    roundId,
    "signulls"
  );
const signullRef = (roomId: RoomId, roundId: RoundId, signullId: SignullId) =>
  doc(
    getDb(),
    V3_ROOMS_COLLECTION,
    roomId,
    "rounds",
    roundId,
    "signulls",
    signullId
  );
const scoreEventsRef = (roomId: RoomId, roundId: RoundId) =>
  collection(
    getDb(),
    V3_ROOMS_COLLECTION,
    roomId,
    "rounds",
    roundId,
    "scoreEvents"
  );

const generateRoundId = (): RoundId => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  return `round_${ts}_${rand}`;
};

const generateSignullId = (): SignullId => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  return `sn_${ts}_${rand}`;
};

const sortPlayersByJoinOrder = (
  players: FirestoreV3PlayerDoc[]
): FirestoreV3PlayerDoc[] =>
  [...players].sort((a, b) => {
    const aJoined = tsToDate(a.joinedAt)?.getTime() ?? 0;
    const bJoined = tsToDate(b.joinedAt)?.getTime() ?? 0;
    if (aJoined !== bJoined) return aJoined - bJoined;
    return a.id.localeCompare(b.id);
  });

const pickNextPlayerId = (
  players: FirestoreV3PlayerDoc[],
  excludingPlayerId: PlayerId
): PlayerId | null =>
  sortPlayersByJoinOrder(players).find(
    (player) => player.id !== excludingPlayerId
  )?.id ?? null;

export const buildInitialV3RoomDoc = (
  roomId: RoomId,
  hostId: PlayerId | null,
  settings?: Partial<GameSettings>,
  isDisplayMode: boolean = false
): FirestoreV3RoomDoc => ({
  schemaVersion: 3,
  roomId,
  phase: "lobby",
  hostId,
  setterId: hostId,
  currentRoundId: null,
  isDisplayMode,
  settings: applySettings(settings),
  createdAt: toFirestoreTime(),
  updatedAt: toFirestoreTime(),
});

export const buildInitialV3PlayerDoc = (
  playerId: PlayerId,
  username: string,
  isFirstPlayer: boolean
): FirestoreV3PlayerDoc => ({
  id: playerId,
  name: username,
  role: isFirstPlayer ? "setter" : "guesser",
  isOnline: true,
  lastActive: toFirestoreTime(),
  score: 0,
  joinedAt: toFirestoreTime(),
  updatedAt: toFirestoreTime(),
});

export const buildInitialV3RoundDoc = (
  roomId: RoomId,
  roundId: RoundId,
  setterId: PlayerId
): FirestoreV3RoundDoc => ({
  roundId,
  roomId,
  setterId,
  secretWord: "",
  revealedCount: 0,
  directGuessesLeft: DIRECT_GUESSES_PER_ROUND,
  lastDirectGuess: null,
  winner: null,
  scoreCountingComplete: false,
  insights: [],
  startedAt: toFirestoreTime(),
  endedAt: null,
  updatedAt: toFirestoreTime(),
});

export const firestoreToV3RoomDoc = (data: FirestoreV3RoomDoc): V3RoomDoc => ({
  ...data,
  createdAt: tsToDate(data.createdAt) ?? new Date(),
  updatedAt: tsToDate(data.updatedAt) ?? new Date(),
});

export const firestoreToV3RoundDoc = (
  data: FirestoreV3RoundDoc
): V3RoundDoc => ({
  ...data,
  startedAt: tsToDate(data.startedAt),
  endedAt: tsToDate(data.endedAt),
  updatedAt: tsToDate(data.updatedAt) ?? new Date(),
});

export const firestoreToV3PlayerDoc = (
  data: FirestoreV3PlayerDoc
): V3PlayerDoc => ({
  ...data,
  lastActive: tsToDate(data.lastActive) ?? new Date(),
  joinedAt: tsToDate(data.joinedAt) ?? new Date(),
  updatedAt: tsToDate(data.updatedAt) ?? new Date(),
});

export const firestoreToV3SignullDoc = (
  data: FirestoreV3SignullDoc
): V3SignullDoc => ({
  ...data,
  connects: data.connects.map((connect) => ({
    ...connect,
    timestamp: tsToDate(connect.timestamp as FirestoreTimeValue) ?? new Date(),
  })),
  createdAt: tsToDate(data.createdAt) ?? new Date(),
  resolvedAt: tsToDate(data.resolvedAt) ?? undefined,
});

export const firestoreToV3ScoreEventDoc = (
  data: FirestoreV3ScoreEventDoc
): V3ScoreEventDoc => ({
  ...data,
  timestamp: tsToDate(data.timestamp) ?? new Date(),
});

export const createRoomV3 = async (
  roomId: RoomId,
  creatorId: PlayerId,
  username: string,
  settings?: Partial<GameSettings>,
  isDisplayMode: boolean = false
): Promise<void> => {
  const batch = writeBatch(getDb());
  const hostId = isDisplayMode ? null : creatorId;

  batch.set(
    roomRef(roomId),
    buildInitialV3RoomDoc(roomId, hostId, settings, isDisplayMode)
  );

  if (!isDisplayMode) {
    batch.set(
      playerRef(roomId, creatorId),
      buildInitialV3PlayerDoc(creatorId, username, true)
    );
  }

  await batch.commit();
};

export const joinRoomV3 = async (
  roomId: RoomId,
  playerId: PlayerId,
  username: string
): Promise<void> => {
  const currentPlayers = await getDocs(query(playersRef(roomId)));

  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const room = roomSnap.data() as FirestoreV3RoomDoc;
    const playerSnap = await trx.get(playerRef(roomId, playerId));
    const isFirstPlayer = currentPlayers.empty;
    const wouldAddPlayer = !playerSnap.exists();
    const shouldBecomeSetter = !room.hostId || !room.setterId || isFirstPlayer;

    if (wouldAddPlayer && currentPlayers.size >= room.settings.maxPlayers) {
      throw new Error("ROOM_FULL");
    }

    trx.set(
      playerRef(roomId, playerId),
      buildInitialV3PlayerDoc(playerId, username, shouldBecomeSetter),
      { merge: true }
    );

    trx.update(roomRef(roomId), {
      hostId: room.hostId ?? playerId,
      setterId: shouldBecomeSetter ? playerId : room.setterId,
      updatedAt: toFirestoreTime(),
    });
  });
};

export const leaveRoomV3 = async (
  roomId: RoomId,
  playerId: PlayerId
): Promise<void> => {
  const currentPlayers = await getDocs(query(playersRef(roomId)));
  const playerDocs = currentPlayers.docs.map(
    (item) => item.data() as FirestoreV3PlayerDoc
  );

  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) return;

    const playerSnap = await trx.get(playerRef(roomId, playerId));
    if (!playerSnap.exists()) return;

    const room = roomSnap.data() as FirestoreV3RoomDoc;
    const leavingPlayer = playerSnap.data() as FirestoreV3PlayerDoc;
    const nextPlayerId = pickNextPlayerId(playerDocs, playerId);
    const newHostId = room.hostId === playerId ? nextPlayerId : room.hostId;
    const leavingSetter =
      room.setterId === playerId || leavingPlayer.role === "setter";
    const newSetterId = leavingSetter ? nextPlayerId : room.setterId;

    trx.delete(playerRef(roomId, playerId));

    if (leavingSetter && nextPlayerId) {
      trx.update(playerRef(roomId, nextPlayerId), {
        role: "setter",
        updatedAt: toFirestoreTime(),
      });
    }

    trx.update(roomRef(roomId), {
      hostId: newHostId,
      setterId: newSetterId,
      updatedAt: toFirestoreTime(),
    });

    if (leavingSetter && room.currentRoundId) {
      trx.update(roundRef(roomId, room.currentRoundId), {
        setterId: newSetterId ?? "",
        updatedAt: toFirestoreTime(),
      });
    }
  });
};

export const changeSetterV3 = async (
  roomId: RoomId,
  newSetterId: PlayerId,
  requesterId: PlayerId
): Promise<void> => {
  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const room = roomSnap.data() as FirestoreV3RoomDoc;
    if (room.hostId !== requesterId) {
      throw new Error("ONLY_HOST_CAN_CHANGE_SETTER");
    }

    const newSetterSnap = await trx.get(playerRef(roomId, newSetterId));
    if (!newSetterSnap.exists()) throw new Error("PLAYER_NOT_FOUND");

    const oldSetterId = room.setterId;
    if (oldSetterId && oldSetterId !== newSetterId) {
      trx.update(playerRef(roomId, oldSetterId), {
        role: "guesser",
        updatedAt: toFirestoreTime(),
      });
    }

    trx.update(playerRef(roomId, newSetterId), {
      role: "setter",
      updatedAt: toFirestoreTime(),
    });

    trx.update(roomRef(roomId), {
      setterId: newSetterId,
      updatedAt: toFirestoreTime(),
    });

    if (room.currentRoundId) {
      trx.update(roundRef(roomId, room.currentRoundId), {
        setterId: newSetterId,
        updatedAt: toFirestoreTime(),
      });
    }
  });
};

export const updatePlayerNameV3 = async (
  roomId: RoomId,
  playerId: PlayerId,
  newName: string
): Promise<void> => {
  const trimmedName = newName.trim();
  if (!trimmedName) throw new Error("INVALID_NAME");

  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const playerSnap = await trx.get(playerRef(roomId, playerId));
    if (!playerSnap.exists()) throw new Error("PLAYER_NOT_FOUND");

    trx.update(playerRef(roomId, playerId), {
      name: trimmedName,
      updatedAt: toFirestoreTime(),
    });
    trx.update(roomRef(roomId), { updatedAt: toFirestoreTime() });
  });
};

export const updateGameSettingsV3 = async (
  roomId: RoomId,
  settings: Partial<GameSettings>
): Promise<void> => {
  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const updates: Record<string, unknown> = {
      updatedAt: toFirestoreTime(),
    };
    for (const [key, value] of Object.entries(settings)) {
      updates[`settings.${key}`] = value;
    }

    trx.update(roomRef(roomId), updates);
  });
};

export const resetPlayerScoresV3 = async (roomId: RoomId): Promise<void> => {
  const currentPlayers = await getDocs(query(playersRef(roomId)));

  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    currentPlayers.docs.forEach((player) => {
      trx.update(playerRef(roomId, player.id), {
        score: 0,
        updatedAt: toFirestoreTime(),
      });
    });
    trx.update(roomRef(roomId), { updatedAt: toFirestoreTime() });
  });
};

export const addPlayerScoreV3 = async (
  roomId: RoomId,
  playerId: PlayerId,
  delta: number
): Promise<void> => {
  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const playerSnap = await trx.get(playerRef(roomId, playerId));
    if (!playerSnap.exists()) throw new Error("PLAYER_NOT_FOUND");

    trx.update(playerRef(roomId, playerId), {
      score: increment(delta),
      updatedAt: toFirestoreTime(),
    });
    trx.update(roomRef(roomId), { updatedAt: toFirestoreTime() });
  });
};

export const startGameV3 = async (
  roomId: RoomId,
  setterId?: PlayerId,
  roundId: RoundId = generateRoundId()
): Promise<RoundId> => {
  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const room = roomSnap.data() as FirestoreV3RoomDoc;
    if (room.phase !== "lobby") throw new Error("INVALID_PHASE");
    const activeSetterId = setterId ?? room.setterId;
    if (!activeSetterId) throw new Error("PLAYER_NOT_FOUND");

    trx.set(
      roundRef(roomId, roundId),
      buildInitialV3RoundDoc(roomId, roundId, activeSetterId)
    );
    trx.update(roomRef(roomId), {
      phase: "setting",
      currentRoundId: roundId,
      updatedAt: toFirestoreTime(),
    });
  });

  return roundId;
};

export const playAgainV3 = async (
  roomId: RoomId,
  setterId?: PlayerId,
  roundId: RoundId = generateRoundId()
): Promise<RoundId> => {
  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");
    const room = roomSnap.data() as FirestoreV3RoomDoc;
    const activeSetterId = setterId ?? room.setterId;
    if (!activeSetterId) throw new Error("PLAYER_NOT_FOUND");

    trx.set(
      roundRef(roomId, roundId),
      buildInitialV3RoundDoc(roomId, roundId, activeSetterId)
    );
    trx.update(roomRef(roomId), {
      phase: "setting",
      currentRoundId: roundId,
      updatedAt: toFirestoreTime(),
    });
  });

  return roundId;
};

export const setSecretWordV3 = async (
  roomId: RoomId,
  setterId: PlayerId,
  word: string
): Promise<void> => {
  const upper = word.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(upper)) {
    throw new Error("INVALID_WORD_FORMAT");
  }

  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const room = roomSnap.data() as FirestoreV3RoomDoc;
    const roundId = getCurrentRoundId(room);
    const activeRoundRef = roundRef(roomId, roundId);
    const roundSnap = await trx.get(activeRoundRef);
    if (!roundSnap.exists()) throw new Error("ROUND_NOT_FOUND");

    const round = roundSnap.data() as FirestoreV3RoundDoc;
    if (round.setterId !== setterId) throw new Error("NOT_SETTER");
    if (room.phase !== "lobby" && room.phase !== "setting") {
      throw new Error("INVALID_PHASE");
    }

    trx.update(activeRoundRef, {
      secretWord: upper,
      revealedCount: 1,
      updatedAt: toFirestoreTime(),
    });
    trx.update(roomRef(roomId), {
      phase: "signulls",
      updatedAt: toFirestoreTime(),
    });
  });
};

export const addSignullV3 = async (
  roomId: RoomId,
  playerId: PlayerId,
  word: string,
  clue: string
): Promise<SignullId> => {
  const signullId = generateSignullId();
  const upperWord = word.trim().toUpperCase();

  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const room = roomSnap.data() as FirestoreV3RoomDoc;
    if (room.phase !== "signulls") throw new Error("INVALID_PHASE");
    const roundId = getCurrentRoundId(room);

    const activeRoundRef = roundRef(roomId, roundId);
    const playerDocRef = playerRef(roomId, playerId);
    const roundSnap = await trx.get(activeRoundRef);
    const playerSnap = await trx.get(playerDocRef);

    if (!roundSnap.exists()) throw new Error("ROUND_NOT_FOUND");
    if (!playerSnap.exists()) throw new Error("PLAYER_NOT_FOUND");

    const round = roundSnap.data() as FirestoreV3RoundDoc;
    const player = playerSnap.data() as FirestoreV3PlayerDoc;
    if (player.role !== "guesser") throw new Error("ONLY_GUESSER_CAN_CREATE");

    if (room.settings.prefixMode) {
      const requiredPrefix = round.secretWord.slice(0, round.revealedCount);
      if (!upperWord.startsWith(requiredPrefix)) {
        throw new Error(`WORD_MUST_START_WITH_${requiredPrefix}`);
      }
    }

    const newSignull: FirestoreV3SignullDoc = {
      id: signullId,
      roundId,
      playerId,
      word: upperWord,
      clue,
      connects: [],
      isFinal: upperWord === round.secretWord,
      status: "pending",
      stage: round.revealedCount,
      createdAt: toFirestoreTime(),
    };

    trx.set(signullRef(roomId, roundId, signullId), newSignull);
    trx.update(activeRoundRef, { updatedAt: toFirestoreTime() });
    trx.update(roomRef(roomId), { updatedAt: toFirestoreTime() });
  });

  return signullId;
};

export const submitConnectV3 = async (
  roomId: RoomId,
  playerId: PlayerId,
  signullId?: SignullId,
  guess?: string
): Promise<void> => {
  const roomSnapshot = await getDocs(query(playersRef(roomId)));
  const playerDocs = roomSnapshot.docs.map(
    (item) => item.data() as FirestoreV3PlayerDoc
  );
  const upperGuess = (guess || "").trim().toUpperCase();

  await runTransaction(getDb(), async (trx) => {
    const roomSnap = await trx.get(roomRef(roomId));
    if (!roomSnap.exists()) throw new Error("ROOM_NOT_FOUND");

    const room = roomSnap.data() as FirestoreV3RoomDoc;
    if (room.phase !== "signulls") throw new Error("INVALID_PHASE");
    const roundId = getCurrentRoundId(room);

    const signullsSnapshot = await getDocs(query(signullsRef(roomId, roundId)));
    const signullDocs = signullsSnapshot.docs.map(
      (item) => item.data() as FirestoreV3SignullDoc
    );

    const playerDocRef = playerRef(roomId, playerId);
    const activeRoundRef = roundRef(roomId, roundId);
    const playerSnap = await trx.get(playerDocRef);
    const roundSnap = await trx.get(activeRoundRef);

    if (!playerSnap.exists()) throw new Error("PLAYER_NOT_FOUND");
    if (!roundSnap.exists()) throw new Error("ROUND_NOT_FOUND");

    const player = playerSnap.data() as FirestoreV3PlayerDoc;
    const round = roundSnap.data() as FirestoreV3RoundDoc;
    const flattenedSignulls = flattenSignulls(signullDocs);
    const targetId =
      signullId ??
      (room.settings.playMode === "round_robin"
        ? flattenedSignulls.find((signull) => signull.status === "pending")?.id
        : undefined);

    if (!targetId) {
      throw new Error(
        room.settings.playMode === "round_robin"
          ? "NO_ACTIVE_SIGNULL"
          : "SIGNULL_ID_REQUIRED"
      );
    }

    const targetRef = signullRef(roomId, roundId, targetId);
    const targetSnap = await trx.get(targetRef);
    if (!targetSnap.exists()) throw new Error("SIGNULL_NOT_FOUND");

    const targetSignull = targetSnap.data() as FirestoreV3SignullDoc;
    if (targetSignull.status !== "pending") {
      throw new Error("SIGNULL_NOT_PENDING");
    }
    if (targetSignull.playerId === playerId) {
      throw new Error("CANNOT_CONNECT_OWN_SIGNULL");
    }
    if (
      player.role !== "setter" &&
      targetSignull.connects.some((connect) => connect.playerId === playerId)
    ) {
      throw new Error("ALREADY_CONNECTED");
    }

    const updatedTarget: FirestoreV3SignullDoc = {
      ...targetSignull,
      connects: [
        ...targetSignull.connects,
        {
          playerId,
          guess: upperGuess,
          timestamp: Timestamp.now(),
          isCorrect: upperGuess === targetSignull.word,
        },
      ],
    };

    const nextSignulls = signullDocs.some((signull) => signull.id === targetId)
      ? signullDocs.map((signull) =>
          signull.id === targetId ? updatedTarget : signull
        )
      : [...signullDocs, updatedTarget];
    const compatRoom = buildCompatGameRoom(
      room,
      round,
      playerDocs,
      nextSignulls
    );
    const compatEntry = compatRoom.signullState.itemsById[targetId];

    let scoreResult: ScoreResult = { updates: {}, events: [] };
    if (updatedTarget.connects.at(-1)?.isCorrect && player.role === "setter") {
      scoreResult = mergeScoreResults(
        scoreResult,
        calculateInterceptScore(playerId, targetId)
      );
    }

    const resolution = evaluateV3Resolution(compatEntry, compatRoom);
    let nextRoomPhase: GamePhase = room.phase;
    let nextWinner = round.winner;
    let nextRevealedCount = round.revealedCount;
    const signullUpdates: Array<{
      id: SignullId;
      status: SignullStatus;
      resolvedAt: FirestoreTimeValue;
    }> = [];

    if (resolution) {
      updatedTarget.status = resolution.status;
      if (resolution.resolvedAt) {
        updatedTarget.resolvedAt = resolution.resolvedAt;
      }

      if (resolution.status === "resolved") {
        nextRevealedCount += 1;

        if (nextRevealedCount >= round.secretWord.length) {
          nextRoomPhase = "ended";
          nextWinner = "guessers";
          resolution.gameEnded = true;
          resolution.winner = "guessers";
        }

        compatRoom.revealedCount = round.revealedCount;
        scoreResult = mergeScoreResults(
          scoreResult,
          calculateSignullResolvedScore(compatEntry, compatRoom)
        );

        flattenSignulls(nextSignulls)
          .filter(
            (signull) =>
              signull.id !== targetId &&
              signull.stage === targetSignull.stage &&
              signull.status === "pending"
          )
          .forEach((signull) => {
            signull.status = "inactive";
            signull.resolvedAt = toFirestoreTime();
            signullUpdates.push({
              id: signull.id,
              status: "inactive",
              resolvedAt: signull.resolvedAt,
            });
          });
      } else if (resolution.status === "failed") {
        scoreResult = mergeScoreResults(
          scoreResult,
          calculateFailedLightningSignullScore(compatEntry, compatRoom)
        );
      }

      if (resolution.gameEnded) {
        nextRoomPhase = "ended";
        nextWinner = resolution.winner;
      }
    }

    if (resolution?.gameEnded && resolution.winner) {
      scoreResult = mergeScoreResults(
        scoreResult,
        calculateGameEndScore(compatRoom, resolution.winner)
      );
    }

    const firestoreScoreEvents: FirestoreScoreEvent[] = scoreResult.events.map(
      (event) => ({
        playerId: event.playerId,
        delta: event.delta,
        reason: event.reason,
        timestamp: Timestamp.now(),
        details: event.details,
      })
    );

    trx.update(targetRef, {
      connects: updatedTarget.connects,
      status: updatedTarget.status,
      resolvedAt: updatedTarget.resolvedAt ?? null,
    });

    signullUpdates.forEach((update) => {
      trx.update(signullRef(roomId, roundId, update.id), {
        status: update.status,
        resolvedAt: update.resolvedAt,
      });
    });

    const roundUpdates: Record<string, unknown> = {
      revealedCount: nextRevealedCount,
      winner: nextWinner ?? null,
      updatedAt: toFirestoreTime(),
    };
    if (resolution?.gameEnded) {
      roundUpdates.endedAt = toFirestoreTime();
      roundUpdates.insights = [];
    }

    trx.update(activeRoundRef, roundUpdates);
    trx.update(roomRef(roomId), {
      phase: nextRoomPhase,
      updatedAt: toFirestoreTime(),
    });

    for (const [pid, delta] of Object.entries(scoreResult.updates)) {
      if (delta !== 0) {
        trx.update(playerRef(roomId, pid), {
          score: increment(delta),
          updatedAt: toFirestoreTime(),
        });
      }
    }

    writeScoreEvents(trx, roomId, roundId, firestoreScoreEvents);
  });
};

const reportError = (onError?: (error: Error) => void) => (error: Error) => {
  onError?.(error);
};

const mapSnapshot = <TRaw, TOut>(
  snapshot: QuerySnapshot<DocumentData>,
  converter: (data: TRaw) => TOut
): TOut[] => snapshot.docs.map((item) => converter(item.data() as TRaw));

const flattenSignulls = (
  signulls: FirestoreV3SignullDoc[]
): FirestoreV3SignullDoc[] =>
  [...signulls].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage;
    const aCreated = tsToDate(a.createdAt)?.getTime() ?? 0;
    const bCreated = tsToDate(b.createdAt)?.getTime() ?? 0;
    if (aCreated !== bCreated) return aCreated - bCreated;
    return a.id.localeCompare(b.id);
  });

const composeSignullOrder = (
  signulls: FirestoreV3SignullDoc[]
): Record<string, SignullId[]> =>
  flattenSignulls(signulls).reduce<Record<string, SignullId[]>>(
    (order, signull) => {
      const stageKey = String(signull.stage);
      order[stageKey] = [...(order[stageKey] ?? []), signull.id];
      return order;
    },
    {}
  );

const composeActiveIndex = (
  room: FirestoreV3RoomDoc,
  signulls: FirestoreV3SignullDoc[]
): number | null => {
  if (room.settings.playMode !== "round_robin") return null;
  const flattened = flattenSignulls(signulls);
  const pendingIndex = flattened.findIndex(
    (signull) => signull.status === "pending"
  );
  return pendingIndex === -1 ? null : pendingIndex;
};

const toFirestoreSignullEntry = (
  signull: FirestoreV3SignullDoc
): FirestoreSignullEntry => ({
  id: signull.id,
  playerId: signull.playerId,
  word: signull.word,
  clue: signull.clue,
  connects: signull.connects,
  isFinal: signull.isFinal,
  status: signull.status,
  createdAt: signull.createdAt,
  resolvedAt: signull.resolvedAt,
});

const buildCompatGameRoom = (
  room: FirestoreV3RoomDoc,
  round: FirestoreV3RoundDoc,
  players: FirestoreV3PlayerDoc[],
  signulls: FirestoreV3SignullDoc[],
  scoreEvents: FirestoreScoreEvent[] = []
): FirestoreGameRoom => {
  const signullEntries = signulls.reduce<
    Record<SignullId, FirestoreSignullEntry>
  >((acc, signull) => {
    acc[signull.id] = toFirestoreSignullEntry(signull);
    return acc;
  }, {});

  return {
    schemaVersion: 2,
    roomId: room.roomId,
    phase: room.phase,
    players: players.reduce<FirestoreGameRoom["players"]>((acc, player) => {
      acc[player.id] = {
        name: player.name,
        role: player.role,
        isOnline: player.isOnline,
        lastActive: player.lastActive,
        score: player.score,
      };
      return acc;
    }, {}),
    hostId: room.hostId,
    isDisplayMode: room.isDisplayMode,
    setterId: round.setterId,
    secretWord: round.secretWord,
    revealedCount: round.revealedCount,
    signullState: {
      order: composeSignullOrder(signulls),
      activeIndex: composeActiveIndex(room, signulls),
      itemsById: signullEntries,
    },
    directGuessesLeft: round.directGuessesLeft,
    lastDirectGuess:
      round.lastDirectGuess as unknown as FirestoreGameRoom["lastDirectGuess"],
    winner: round.winner,
    settings: room.settings,
    scoreEvents,
    scoreCountingComplete: round.scoreCountingComplete,
    insights: round.insights,
    createdAt: room.createdAt,
    updatedAt: round.updatedAt,
  };
};

interface ResolutionResult {
  status: SignullStatus;
  gameEnded: boolean;
  winner: FirestoreGameRoom["winner"];
  resolvedAt: FirestoreTimeValue | null;
}

const evaluateV3Resolution = (
  entry: FirestoreSignullEntry,
  data: FirestoreGameRoom
): ResolutionResult | null => {
  if (entry.status !== "pending") return null;

  const connectsRequired = data.settings.connectsRequired;
  const guesserIds = Object.keys(data.players).filter(
    (id) => data.players[id].role === "guesser"
  );
  const correctCount = entry.connects.filter(
    (connect) => connect.isCorrect
  ).length;
  const setterBlocks = entry.connects.some(
    (connect) =>
      data.players[connect.playerId]?.role === "setter" && connect.isCorrect
  );

  if (setterBlocks) {
    return {
      status: "blocked",
      gameEnded: false,
      winner: data.winner,
      resolvedAt: toFirestoreTime(),
    };
  }

  if (correctCount >= connectsRequired) {
    return {
      status: "resolved",
      gameEnded: entry.isFinal,
      winner: entry.isFinal ? "guessers" : data.winner,
      resolvedAt: toFirestoreTime(),
    };
  }

  const eligibleGuesserIds = guesserIds.filter((id) => id !== entry.playerId);
  const allGuessersAttempted = eligibleGuesserIds.every((id) =>
    entry.connects.some((connect) => connect.playerId === id)
  );
  if (allGuessersAttempted && correctCount < connectsRequired) {
    return {
      status: "failed",
      gameEnded: entry.isFinal,
      winner: entry.isFinal ? "setter" : data.winner,
      resolvedAt: toFirestoreTime(),
    };
  }

  return null;
};

const getCurrentRoundId = (room: FirestoreV3RoomDoc): RoundId => {
  if (!room.currentRoundId) throw new Error("ROUND_NOT_FOUND");
  return room.currentRoundId;
};

const writeScoreEvents = (
  trx: Transaction,
  roomId: RoomId,
  roundId: RoundId,
  events: FirestoreScoreEvent[]
) => {
  events.forEach((event) => {
    trx.set(doc(scoreEventsRef(roomId, roundId)), {
      ...event,
      roundId,
    });
  });
};

export const subscribeToV3GameState = (
  roomId: RoomId,
  onChange: (game: V3ComposedGameState | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  let room: V3RoomDoc | null = null;
  let round: V3RoundDoc | null = null;
  let players: V3PlayerDoc[] = [];
  let signulls: V3SignullDoc[] = [];
  let scoreEvents: V3ScoreEventDoc[] = [];
  let roundUnsubscribe: Unsubscribe | null = null;
  let signullsUnsubscribe: Unsubscribe | null = null;
  let scoreEventsUnsubscribe: Unsubscribe | null = null;

  const emit = () => {
    if (!room) {
      onChange(null);
      return;
    }

    onChange(
      composeV3GameState({ room, round, players, signulls, scoreEvents })
    );
  };

  const unsubscribeRoom = onSnapshot(
    roomRef(roomId),
    (snapshot) => {
      if (!snapshot.exists()) {
        room = null;
        emit();
        return;
      }

      const previousRoundId = room?.currentRoundId ?? null;
      room = firestoreToV3RoomDoc(snapshot.data() as FirestoreV3RoomDoc);

      if (room.currentRoundId !== previousRoundId) {
        round = null;
        signulls = [];
        scoreEvents = [];
        roundUnsubscribe?.();
        signullsUnsubscribe?.();
        scoreEventsUnsubscribe?.();

        if (room.currentRoundId) {
          const activeRoundId = room.currentRoundId;
          roundUnsubscribe = onSnapshot(
            roundRef(roomId, activeRoundId),
            (roundSnapshot) => {
              round = roundSnapshot.exists()
                ? firestoreToV3RoundDoc(
                    roundSnapshot.data() as FirestoreV3RoundDoc
                  )
                : null;
              emit();
            },
            reportError(onError)
          );
          signullsUnsubscribe = onSnapshot(
            query(signullsRef(roomId, activeRoundId)),
            (signullSnapshot) => {
              signulls = mapSnapshot<FirestoreV3SignullDoc, V3SignullDoc>(
                signullSnapshot,
                firestoreToV3SignullDoc
              );
              emit();
            },
            reportError(onError)
          );
          scoreEventsUnsubscribe = onSnapshot(
            query(scoreEventsRef(roomId, activeRoundId)),
            (scoreSnapshot) => {
              scoreEvents = mapSnapshot<
                FirestoreV3ScoreEventDoc,
                V3ScoreEventDoc
              >(scoreSnapshot, firestoreToV3ScoreEventDoc);
              emit();
            },
            reportError(onError)
          );
        }
      }

      emit();
    },
    reportError(onError)
  );

  const unsubscribePlayers = onSnapshot(
    query(playersRef(roomId)),
    (snapshot) => {
      players = mapSnapshot<FirestoreV3PlayerDoc, V3PlayerDoc>(
        snapshot,
        firestoreToV3PlayerDoc
      );
      emit();
    },
    reportError(onError)
  );

  return () => {
    unsubscribeRoom();
    unsubscribePlayers();
    roundUnsubscribe?.();
    signullsUnsubscribe?.();
    scoreEventsUnsubscribe?.();
  };
};

export const v3RoomAdapter = {
  createRoom: createRoomV3,
  joinRoom: joinRoomV3,
  leaveRoom: leaveRoomV3,
  updatePlayerName: updatePlayerNameV3,
  updateGameSettings: updateGameSettingsV3,
  changeSetter: changeSetterV3,
  startGame: startGameV3,
  playAgain: playAgainV3,
  setSecretWord: setSecretWordV3,
  addSignull: addSignullV3,
  submitConnect: submitConnectV3,
  resetPlayerScores: resetPlayerScoresV3,
  addPlayerScore: addPlayerScoreV3,
  subscribeToGameState: subscribeToV3GameState,
};
