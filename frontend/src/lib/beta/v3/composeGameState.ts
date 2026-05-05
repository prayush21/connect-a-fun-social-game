import type {
  GameState,
  Player,
  SignullEntry,
  SignullId,
  SignullState,
} from "../types";
import type { V3GameStateInput } from "./types";

export type V3ComposedGameState = Omit<GameState, "schemaVersion"> & {
  schemaVersion: 3;
};

const EMPTY_SIGNULL_STATE: SignullState = {
  order: {},
  itemsById: {},
  activeIndex: null,
};

const flattenOrder = (order: Record<string, SignullId[]>): SignullId[] =>
  Object.keys(order)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((stage) => order[String(stage)] ?? []);

const composePlayers = (
  players: V3GameStateInput["players"]
): Record<string, Player> =>
  players.reduce<Record<string, Player>>((acc, player) => {
    acc[player.id] = {
      id: player.id,
      name: player.name,
      role: player.role,
      isOnline: player.isOnline,
      lastActive: player.lastActive,
      score: player.score,
    };
    return acc;
  }, {});

const composeSignullState = (
  signulls: NonNullable<V3GameStateInput["signulls"]>,
  playMode: V3GameStateInput["room"]["settings"]["playMode"]
): SignullState => {
  if (signulls.length === 0) {
    return { ...EMPTY_SIGNULL_STATE, order: {}, itemsById: {} };
  }

  const sorted = [...signulls].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage;
    if (a.createdAt.getTime() !== b.createdAt.getTime()) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return a.id.localeCompare(b.id);
  });

  const order: SignullState["order"] = {};
  const itemsById: SignullState["itemsById"] = {};

  sorted.forEach((signull) => {
    const stageKey = String(signull.stage);
    order[stageKey] = [...(order[stageKey] ?? []), signull.id];
    itemsById[signull.id] = {
      id: signull.id,
      playerId: signull.playerId,
      word: signull.word,
      clue: signull.clue,
      connects: [...signull.connects].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
      isFinal: signull.isFinal,
      status: signull.status,
      createdAt: signull.createdAt,
      resolvedAt: signull.resolvedAt,
    };
  });

  const flattened = flattenOrder(order);
  const firstPendingId = flattened.find(
    (id) => itemsById[id]?.status === "pending"
  );

  return {
    order,
    itemsById,
    activeIndex:
      playMode === "round_robin" && firstPendingId
        ? flattened.indexOf(firstPendingId)
        : null,
  };
};

export const composeV3GameState = ({
  room,
  round,
  players,
  signulls = [],
  scoreEvents = [],
}: V3GameStateInput): V3ComposedGameState => {
  const sortedScoreEvents = [...scoreEvents].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const signullState = composeSignullState(signulls, room.settings.playMode);
  const latestSignullUpdate = signulls
    .map((signull) => signull.resolvedAt ?? signull.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    schemaVersion: 3,
    roomId: room.roomId,
    phase: room.phase,
    players: composePlayers(players),
    hostId: room.hostId,
    isDisplayMode: room.isDisplayMode,
    setterId: round?.setterId ?? room.setterId ?? "",
    secretWord: round?.secretWord ?? "",
    revealedCount: round?.revealedCount ?? 0,
    signullState,
    directGuessesLeft: round?.directGuessesLeft ?? 3,
    lastDirectGuess: round?.lastDirectGuess ?? null,
    winner: round?.winner ?? null,
    settings: room.settings,
    scoreEvents: sortedScoreEvents.map(({ id, roundId, ...event }) => event),
    scoreCountingComplete: round?.scoreCountingComplete ?? false,
    insights: round?.insights ?? [],
    createdAt: room.createdAt,
    updatedAt:
      latestSignullUpdate &&
      latestSignullUpdate.getTime() > room.updatedAt.getTime()
        ? latestSignullUpdate
        : room.updatedAt,
  };
};
