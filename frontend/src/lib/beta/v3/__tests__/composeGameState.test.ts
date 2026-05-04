import { describe, expect, it } from "vitest";
import { composeV3GameState } from "../composeGameState";
import type {
  V3GameStateInput,
  V3PlayerDoc,
  V3RoomDoc,
  V3RoundDoc,
  V3SignullDoc,
} from "../types";
import type { GameSettings } from "../../types";

const at = (iso: string) => new Date(iso);

const settings: GameSettings = {
  playMode: "round_robin",
  connectsRequired: 2,
  maxPlayers: 8,
  timeLimitSeconds: 30,
  wordValidation: "strict",
  prefixMode: true,
  displaySoundMode: true,
  showScoreBreakdown: true,
};

const room: V3RoomDoc = {
  schemaVersion: 3,
  roomId: "ROOM42",
  phase: "signulls",
  hostId: "host",
  currentRoundId: "round-1",
  isDisplayMode: false,
  settings,
  createdAt: at("2026-01-01T00:00:00.000Z"),
  updatedAt: at("2026-01-01T00:05:00.000Z"),
};

const round: V3RoundDoc = {
  roundId: "round-1",
  roomId: "ROOM42",
  setterId: "host",
  secretWord: "SIGNAL",
  revealedCount: 2,
  directGuessesLeft: 3,
  lastDirectGuess: null,
  winner: null,
  scoreCountingComplete: false,
  insights: [],
  startedAt: at("2026-01-01T00:01:00.000Z"),
  endedAt: null,
  updatedAt: at("2026-01-01T00:05:00.000Z"),
};

const players: V3PlayerDoc[] = [
  {
    id: "host",
    name: "Host",
    role: "setter",
    isOnline: true,
    lastActive: at("2026-01-01T00:04:00.000Z"),
    score: 5,
    joinedAt: at("2026-01-01T00:00:30.000Z"),
    updatedAt: at("2026-01-01T00:04:00.000Z"),
  },
  {
    id: "guesser-1",
    name: "Guesser One",
    role: "guesser",
    isOnline: true,
    lastActive: at("2026-01-01T00:04:30.000Z"),
    score: 10,
    joinedAt: at("2026-01-01T00:00:40.000Z"),
    updatedAt: at("2026-01-01T00:04:30.000Z"),
  },
];

const makeSignull = (
  overrides: Partial<V3SignullDoc> & Pick<V3SignullDoc, "id" | "stage">
): V3SignullDoc => ({
  roundId: "round-1",
  playerId: "guesser-1",
  word: "SILVER",
  clue: "moon color",
  status: "pending",
  isFinal: false,
  connects: [],
  createdAt: at("2026-01-01T00:03:00.000Z"),
  ...overrides,
});

const compose = (input: Partial<V3GameStateInput> = {}) =>
  composeV3GameState({
    room,
    round,
    players,
    signulls: [],
    scoreEvents: [],
    ...input,
  });

describe("composeV3GameState", () => {
  it("composes split room, round, and player docs into a UI-facing game state", () => {
    const game = compose();

    expect(game).toMatchObject({
      schemaVersion: 3,
      roomId: "ROOM42",
      phase: "signulls",
      hostId: "host",
      setterId: "host",
      secretWord: "SIGNAL",
      revealedCount: 2,
      directGuessesLeft: 3,
      winner: null,
      settings,
    });
    expect(game.players.host).toMatchObject({
      id: "host",
      name: "Host",
      role: "setter",
      score: 5,
    });
    expect(game.players["guesser-1"]).toMatchObject({
      id: "guesser-1",
      name: "Guesser One",
      role: "guesser",
      score: 10,
    });
  });

  it("uses safe gameplay defaults when a room has no current round yet", () => {
    const game = compose({
      room: {
        ...room,
        phase: "lobby",
        currentRoundId: null,
      },
      round: null,
    });

    expect(game.phase).toBe("lobby");
    expect(game.setterId).toBe("");
    expect(game.secretWord).toBe("");
    expect(game.revealedCount).toBe(0);
    expect(game.directGuessesLeft).toBe(3);
    expect(game.signullState).toEqual({
      order: {},
      itemsById: {},
      activeIndex: null,
    });
  });

  it("groups Signulls by stage and preserves deterministic order", () => {
    const game = compose({
      signulls: [
        makeSignull({
          id: "sn-stage-2-late",
          stage: 2,
          createdAt: at("2026-01-01T00:04:00.000Z"),
        }),
        makeSignull({
          id: "sn-stage-1",
          stage: 1,
          createdAt: at("2026-01-01T00:02:00.000Z"),
        }),
        makeSignull({
          id: "sn-stage-2-early",
          stage: 2,
          createdAt: at("2026-01-01T00:03:00.000Z"),
        }),
      ],
    });

    expect(game.signullState.order).toEqual({
      "1": ["sn-stage-1"],
      "2": ["sn-stage-2-early", "sn-stage-2-late"],
    });
    expect(Object.keys(game.signullState.itemsById)).toEqual([
      "sn-stage-1",
      "sn-stage-2-early",
      "sn-stage-2-late",
    ]);
  });

  it("sets activeIndex to the first pending Signull in round-robin mode", () => {
    const game = compose({
      signulls: [
        makeSignull({
          id: "sn-resolved",
          stage: 1,
          status: "resolved",
          createdAt: at("2026-01-01T00:02:00.000Z"),
        }),
        makeSignull({
          id: "sn-pending",
          stage: 2,
          status: "pending",
          createdAt: at("2026-01-01T00:03:00.000Z"),
        }),
      ],
    });

    expect(game.signullState.activeIndex).toBe(1);
  });

  it("does not set activeIndex in free play mode", () => {
    const game = compose({
      room: {
        ...room,
        settings: {
          ...settings,
          playMode: "free",
        },
      },
      signulls: [
        makeSignull({
          id: "sn-pending",
          stage: 2,
          status: "pending",
        }),
      ],
    });

    expect(game.signullState.activeIndex).toBeNull();
  });

  it("sorts connects and score events chronologically", () => {
    const game = compose({
      signulls: [
        makeSignull({
          id: "sn-connects",
          stage: 2,
          connects: [
            {
              playerId: "host",
              guess: "WRONG",
              isCorrect: false,
              timestamp: at("2026-01-01T00:04:00.000Z"),
            },
            {
              playerId: "guesser-1",
              guess: "SILVER",
              isCorrect: true,
              timestamp: at("2026-01-01T00:03:30.000Z"),
            },
          ],
        }),
      ],
      scoreEvents: [
        {
          id: "score-2",
          roundId: "round-1",
          playerId: "host",
          delta: 5,
          reason: "intercept_signull",
          timestamp: at("2026-01-01T00:05:00.000Z"),
        },
        {
          id: "score-1",
          roundId: "round-1",
          playerId: "guesser-1",
          delta: 10,
          reason: "signull_resolved",
          timestamp: at("2026-01-01T00:04:30.000Z"),
        },
      ],
    });

    expect(
      game.signullState.itemsById["sn-connects"].connects.map((c) => c.guess)
    ).toEqual(["SILVER", "WRONG"]);
    expect(game.scoreEvents.map((event) => event.delta)).toEqual([10, 5]);
  });
});
