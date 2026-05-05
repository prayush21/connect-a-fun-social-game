import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FirestoreV3RoomDoc } from "../types";

const firestoreMock = vi.hoisted(() => {
  class MockTimestamp {
    constructor(private readonly value: Date) {}

    static now() {
      return new MockTimestamp(new Date("2026-01-01T00:10:00.000Z"));
    }

    toDate() {
      return this.value;
    }
  }

  const batch = {
    set: vi.fn(),
    commit: vi.fn(async () => undefined),
  };
  const trx = {
    delete: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  };

  return {
    MockTimestamp,
    batch,
    trx,
    collection: vi.fn((...path: unknown[]) => ({ kind: "collection", path })),
    doc: vi.fn((...path: unknown[]) => ({ kind: "doc", path })),
    getDocs: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn((ref: unknown) => ({ kind: "query", ref })),
    runTransaction: vi.fn(async (_db: unknown, callback: unknown) =>
      (callback as (trx: unknown) => Promise<void>)(trx)
    ),
    serverTimestamp: vi.fn(() => ({ __type: "serverTimestamp" })),
    increment: vi.fn((delta: number) => ({ __type: "increment", delta })),
    writeBatch: vi.fn(() => batch),
  };
});

vi.mock("firebase/firestore", () => ({
  collection: firestoreMock.collection,
  doc: firestoreMock.doc,
  getDocs: firestoreMock.getDocs,
  increment: firestoreMock.increment,
  onSnapshot: firestoreMock.onSnapshot,
  query: firestoreMock.query,
  runTransaction: firestoreMock.runTransaction,
  serverTimestamp: firestoreMock.serverTimestamp,
  Timestamp: firestoreMock.MockTimestamp,
  writeBatch: firestoreMock.writeBatch,
}));

vi.mock("../../../firebase/config", () => ({
  getDb: () => ({ kind: "db" }),
}));

import {
  buildInitialV3RoomDoc,
  createRoomV3,
  firestoreToV3RoomDoc,
  joinRoomV3,
  leaveRoomV3,
  playAgainV3,
  startGameV3,
  updatePlayerNameV3,
  changeSetterV3,
  setSecretWordV3,
  addSignullV3,
  submitConnectV3,
} from "../firebase";
import type {
  FirestoreV3PlayerDoc,
  FirestoreV3RoundDoc,
  FirestoreV3SignullDoc,
} from "../types";

const roomData = (overrides: Partial<FirestoreV3RoomDoc> = {}) => ({
  ...buildInitialV3RoomDoc("ROOM42", "host"),
  ...overrides,
});

const playerData = (
  id: string,
  overrides: Partial<FirestoreV3PlayerDoc> = {}
): FirestoreV3PlayerDoc => ({
  id,
  name: id,
  role: "guesser",
  isOnline: true,
  lastActive: new firestoreMock.MockTimestamp(
    new Date("2026-01-01T00:00:00.000Z")
  ) as unknown as FirestoreV3PlayerDoc["lastActive"],
  score: 0,
  joinedAt: new firestoreMock.MockTimestamp(
    new Date("2026-01-01T00:00:00.000Z")
  ) as unknown as FirestoreV3PlayerDoc["joinedAt"],
  updatedAt: new firestoreMock.MockTimestamp(
    new Date("2026-01-01T00:00:00.000Z")
  ) as unknown as FirestoreV3PlayerDoc["updatedAt"],
  ...overrides,
});

const playersSnapshot = (players: FirestoreV3PlayerDoc[]) => ({
  empty: players.length === 0,
  size: players.length,
  docs: players.map((player) => ({
    id: player.id,
    data: () => player,
  })),
});

const roundData = (
  overrides: Partial<FirestoreV3RoundDoc> = {}
): FirestoreV3RoundDoc => ({
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
  startedAt: new firestoreMock.MockTimestamp(
    new Date("2026-01-01T00:01:00.000Z")
  ) as unknown as FirestoreV3RoundDoc["startedAt"],
  endedAt: null,
  updatedAt: new firestoreMock.MockTimestamp(
    new Date("2026-01-01T00:05:00.000Z")
  ) as unknown as FirestoreV3RoundDoc["updatedAt"],
  ...overrides,
});

const signullData = (
  overrides: Partial<FirestoreV3SignullDoc> = {}
): FirestoreV3SignullDoc => ({
  id: "sn-1",
  roundId: "round-1",
  playerId: "guesser-1",
  word: "SIGNET",
  clue: "ring clue",
  connects: [],
  isFinal: false,
  status: "pending",
  stage: 2,
  createdAt: new firestoreMock.MockTimestamp(
    new Date("2026-01-01T00:03:00.000Z")
  ) as unknown as FirestoreV3SignullDoc["createdAt"],
  ...overrides,
});

const signullsSnapshot = (signulls: FirestoreV3SignullDoc[]) => ({
  docs: signulls.map((signull) => ({
    id: signull.id,
    data: () => signull,
  })),
});

describe("v3 Firebase room helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock.batch.set.mockClear();
    firestoreMock.batch.commit.mockClear();
    firestoreMock.trx.get.mockReset();
    firestoreMock.trx.delete.mockClear();
    firestoreMock.trx.set.mockClear();
    firestoreMock.trx.update.mockClear();
  });

  it("builds initial room documents with schema version 3 and merged settings", () => {
    const room = buildInitialV3RoomDoc("ROOM42", "host", {
      connectsRequired: 4,
      playMode: "free",
    });

    expect(room).toMatchObject({
      schemaVersion: 3,
      roomId: "ROOM42",
      phase: "lobby",
      hostId: "host",
      setterId: "host",
      currentRoundId: null,
      isDisplayMode: false,
      settings: {
        connectsRequired: 4,
        playMode: "free",
        maxPlayers: 8,
      },
    });
  });

  it("creates a room and first player in a single batch", async () => {
    await createRoomV3("ROOM42", "host", "Host");

    expect(firestoreMock.writeBatch).toHaveBeenCalledTimes(1);
    expect(firestoreMock.batch.set).toHaveBeenCalledTimes(2);
    expect(firestoreMock.batch.set.mock.calls[0][1]).toMatchObject({
      schemaVersion: 3,
      roomId: "ROOM42",
      hostId: "host",
      setterId: "host",
    });
    expect(firestoreMock.batch.set.mock.calls[1][1]).toMatchObject({
      id: "host",
      name: "Host",
      role: "setter",
      score: 0,
    });
    expect(firestoreMock.batch.commit).toHaveBeenCalledTimes(1);
  });

  it("creates display-mode rooms without a player document", async () => {
    await createRoomV3("ROOM42", "display", "TV", undefined, true);

    expect(firestoreMock.batch.set).toHaveBeenCalledTimes(1);
    expect(firestoreMock.batch.set.mock.calls[0][1]).toMatchObject({
      hostId: null,
      setterId: null,
      isDisplayMode: true,
    });
  });

  it("joins the first real player as host and setter when room has no players", async () => {
    firestoreMock.getDocs.mockResolvedValue({ empty: true, size: 0 });
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) return { exists: () => false };
        return {
          exists: () => true,
          data: () => roomData({ hostId: null }),
        };
      }
    );

    await joinRoomV3("ROOM42", "player-1", "Player One");

    expect(firestoreMock.trx.set.mock.calls[0][1]).toMatchObject({
      id: "player-1",
      role: "setter",
    });
    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      hostId: "player-1",
      setterId: "player-1",
    });
  });

  it("joins later players as guessers without changing host or setter", async () => {
    firestoreMock.getDocs.mockResolvedValue(
      playersSnapshot([playerData("host", { role: "setter" })])
    );
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) return { exists: () => false };
        return {
          exists: () => true,
          data: () => roomData({ hostId: "host", setterId: "host" }),
        };
      }
    );

    await joinRoomV3("ROOM42", "player-2", "Player Two");

    expect(firestoreMock.trx.set.mock.calls[0][1]).toMatchObject({
      id: "player-2",
      role: "guesser",
    });
    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      hostId: "host",
      setterId: "host",
    });
  });

  it("transfers host and setter when the host setter leaves", async () => {
    const host = playerData("host", {
      role: "setter",
      joinedAt: new firestoreMock.MockTimestamp(
        new Date("2026-01-01T00:00:00.000Z")
      ) as unknown as FirestoreV3PlayerDoc["joinedAt"],
    });
    const next = playerData("player-2", {
      joinedAt: new firestoreMock.MockTimestamp(
        new Date("2026-01-01T00:01:00.000Z")
      ) as unknown as FirestoreV3PlayerDoc["joinedAt"],
    });

    firestoreMock.getDocs.mockResolvedValue(playersSnapshot([host, next]));
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return { exists: () => true, data: () => host };
        }
        return {
          exists: () => true,
          data: () =>
            roomData({
              hostId: "host",
              setterId: "host",
              currentRoundId: "round-1",
            }),
        };
      }
    );

    await leaveRoomV3("ROOM42", "host");

    expect(firestoreMock.trx.delete).toHaveBeenCalledTimes(1);
    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      role: "setter",
    });
    expect(firestoreMock.trx.update.mock.calls[1][1]).toMatchObject({
      hostId: "player-2",
      setterId: "player-2",
    });
    expect(firestoreMock.trx.update.mock.calls[2][1]).toMatchObject({
      setterId: "player-2",
    });
  });

  it("clears host and setter when the final player leaves", async () => {
    const host = playerData("host", { role: "setter" });
    firestoreMock.getDocs.mockResolvedValue(playersSnapshot([host]));
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return { exists: () => true, data: () => host };
        }
        return {
          exists: () => true,
          data: () => roomData({ hostId: "host", setterId: "host" }),
        };
      }
    );

    await leaveRoomV3("ROOM42", "host");

    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      hostId: null,
      setterId: null,
    });
  });

  it("lets the host change setter by updating player docs and room metadata", async () => {
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return {
            exists: () => true,
            data: () => playerData("player-2"),
          };
        }
        return {
          exists: () => true,
          data: () =>
            roomData({
              hostId: "host",
              setterId: "host",
              currentRoundId: "round-1",
            }),
        };
      }
    );

    await changeSetterV3("ROOM42", "player-2", "host");

    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      role: "guesser",
    });
    expect(firestoreMock.trx.update.mock.calls[1][1]).toMatchObject({
      role: "setter",
    });
    expect(firestoreMock.trx.update.mock.calls[2][1]).toMatchObject({
      setterId: "player-2",
    });
    expect(firestoreMock.trx.update.mock.calls[3][1]).toMatchObject({
      setterId: "player-2",
    });
  });

  it("updates player names in player documents", async () => {
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return {
            exists: () => true,
            data: () => playerData("host", { role: "setter" }),
          };
        }
        return {
          exists: () => true,
          data: () => roomData(),
        };
      }
    );

    await updatePlayerNameV3("ROOM42", "host", "  New Host  ");

    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      name: "New Host",
    });
  });

  it("starts a new round and points the room at it", async () => {
    firestoreMock.trx.get.mockResolvedValue({
      exists: () => true,
      data: () => roomData({ phase: "lobby" }),
    });

    const roundId = await startGameV3("ROOM42", "host", "round-1");

    expect(roundId).toBe("round-1");
    expect(firestoreMock.trx.set.mock.calls[0][1]).toMatchObject({
      roundId: "round-1",
      roomId: "ROOM42",
      setterId: "host",
      secretWord: "",
      directGuessesLeft: 3,
    });
    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      phase: "setting",
      currentRoundId: "round-1",
    });
  });

  it("rejects startGame outside the lobby phase", async () => {
    firestoreMock.trx.get.mockResolvedValue({
      exists: () => true,
      data: () => roomData({ phase: "signulls" }),
    });

    await expect(startGameV3("ROOM42", "host", "round-1")).rejects.toThrow(
      "INVALID_PHASE"
    );
  });

  it("playAgain preserves room settings while creating a fresh setting round", async () => {
    firestoreMock.trx.get.mockResolvedValue({
      exists: () => true,
      data: () =>
        roomData({
          phase: "ended",
          settings: {
            ...roomData().settings,
            connectsRequired: 4,
          },
        }),
    });

    await playAgainV3("ROOM42", "host", "round-2");

    expect(firestoreMock.trx.set.mock.calls[0][1]).toMatchObject({
      roundId: "round-2",
      revealedCount: 0,
      winner: null,
    });
    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      phase: "setting",
      currentRoundId: "round-2",
    });
  });

  it("sets the secret word on the current round and moves the room to signulls", async () => {
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("rounds")) {
          return { exists: () => true, data: () => roundData() };
        }
        return {
          exists: () => true,
          data: () => roomData({ phase: "setting", currentRoundId: "round-1" }),
        };
      }
    );

    await setSecretWordV3("ROOM42", "host", " signal ");

    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      secretWord: "SIGNAL",
      revealedCount: 1,
    });
    expect(firestoreMock.trx.update.mock.calls[1][1]).toMatchObject({
      phase: "signulls",
    });
  });

  it("creates Signulls under the current round with the revealed-count stage", async () => {
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return {
            exists: () => true,
            data: () => playerData("guesser-1"),
          };
        }
        if (ref.path.includes("rounds")) {
          return { exists: () => true, data: () => roundData() };
        }
        return {
          exists: () => true,
          data: () =>
            roomData({ phase: "signulls", currentRoundId: "round-1" }),
        };
      }
    );

    const signullId = await addSignullV3(
      "ROOM42",
      "guesser-1",
      "signet",
      "ring clue"
    );

    expect(signullId).toMatch(/^sn_/);
    expect(firestoreMock.trx.set.mock.calls[0][0].path).toContain("signulls");
    expect(firestoreMock.trx.set.mock.calls[0][1]).toMatchObject({
      roundId: "round-1",
      playerId: "guesser-1",
      word: "SIGNET",
      clue: "ring clue",
      stage: 2,
      status: "pending",
    });
  });

  it("enforces prefix-mode validation when creating Signulls", async () => {
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return {
            exists: () => true,
            data: () => playerData("guesser-1"),
          };
        }
        if (ref.path.includes("rounds")) {
          return { exists: () => true, data: () => roundData() };
        }
        return {
          exists: () => true,
          data: () =>
            roomData({ phase: "signulls", currentRoundId: "round-1" }),
        };
      }
    );

    await expect(
      addSignullV3("ROOM42", "guesser-1", "banana", "fruit")
    ).rejects.toThrow("WORD_MUST_START_WITH_SI");
  });

  it("rejects duplicate connects from the same guesser", async () => {
    const players = [
      playerData("host", { role: "setter" }),
      playerData("guesser-1"),
      playerData("guesser-2"),
    ];
    const signull = signullData({
      connects: [
        {
          playerId: "guesser-2",
          guess: "WRONG",
          isCorrect: false,
          timestamp: new firestoreMock.MockTimestamp(
            new Date("2026-01-01T00:04:00.000Z")
          ) as unknown as FirestoreV3SignullDoc["connects"][number]["timestamp"],
        },
      ],
    });
    firestoreMock.getDocs
      .mockResolvedValueOnce(playersSnapshot(players))
      .mockResolvedValueOnce(signullsSnapshot([signull]));
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return { exists: () => true, data: () => playerData("guesser-2") };
        }
        if (ref.path.at(-1) === "round-1") {
          return { exists: () => true, data: () => roundData() };
        }
        if (ref.path.at(-1) === "sn-1") {
          return { exists: () => true, data: () => signull };
        }
        return {
          exists: () => true,
          data: () =>
            roomData({ phase: "signulls", currentRoundId: "round-1" }),
        };
      }
    );

    await expect(
      submitConnectV3("ROOM42", "guesser-2", "sn-1", "SIGNET")
    ).rejects.toThrow("ALREADY_CONNECTED");
  });

  it("rejects connects on a player's own Signull", async () => {
    const players = [
      playerData("host", { role: "setter" }),
      playerData("guesser-1"),
    ];
    const signull = signullData();
    firestoreMock.getDocs
      .mockResolvedValueOnce(playersSnapshot(players))
      .mockResolvedValueOnce(signullsSnapshot([signull]));
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return { exists: () => true, data: () => playerData("guesser-1") };
        }
        if (ref.path.at(-1) === "round-1") {
          return { exists: () => true, data: () => roundData() };
        }
        if (ref.path.at(-1) === "sn-1") {
          return { exists: () => true, data: () => signull };
        }
        return {
          exists: () => true,
          data: () =>
            roomData({ phase: "signulls", currentRoundId: "round-1" }),
        };
      }
    );

    await expect(
      submitConnectV3("ROOM42", "guesser-1", "sn-1", "SIGNET")
    ).rejects.toThrow("CANNOT_CONNECT_OWN_SIGNULL");
  });

  it("resolves a Signull at connectsRequired and inactivates other pending Signulls", async () => {
    const players = [
      playerData("host", { role: "setter" }),
      playerData("guesser-1"),
      playerData("guesser-2"),
      playerData("guesser-3"),
    ];
    const signull = signullData({
      connects: [
        {
          playerId: "guesser-2",
          guess: "SIGNET",
          isCorrect: true,
          timestamp: new firestoreMock.MockTimestamp(
            new Date("2026-01-01T00:04:00.000Z")
          ) as unknown as FirestoreV3SignullDoc["connects"][number]["timestamp"],
        },
      ],
    });
    const otherSignull = signullData({ id: "sn-2", playerId: "guesser-2" });
    firestoreMock.getDocs
      .mockResolvedValueOnce(playersSnapshot(players))
      .mockResolvedValueOnce(signullsSnapshot([signull, otherSignull]));
    firestoreMock.trx.get.mockImplementation(
      async (ref: { path: unknown[] }) => {
        if (ref.path.includes("players")) {
          return { exists: () => true, data: () => playerData("guesser-3") };
        }
        if (ref.path.at(-1) === "round-1") {
          return { exists: () => true, data: () => roundData() };
        }
        if (ref.path.at(-1) === "sn-1") {
          return { exists: () => true, data: () => signull };
        }
        return {
          exists: () => true,
          data: () =>
            roomData({ phase: "signulls", currentRoundId: "round-1" }),
        };
      }
    );

    await submitConnectV3("ROOM42", "guesser-3", "sn-1", "SIGNET");

    expect(firestoreMock.trx.update.mock.calls[0][1]).toMatchObject({
      status: "resolved",
    });
    expect(firestoreMock.trx.update.mock.calls[1][1]).toMatchObject({
      status: "inactive",
    });
    expect(firestoreMock.trx.update.mock.calls[2][1]).toMatchObject({
      revealedCount: 3,
    });
  });

  it("converts Firestore timestamps to Date values", () => {
    const createdAt = new firestoreMock.MockTimestamp(
      new Date("2026-01-01T00:00:00.000Z")
    );
    const updatedAt = new firestoreMock.MockTimestamp(
      new Date("2026-01-01T00:05:00.000Z")
    );

    const room = firestoreToV3RoomDoc(
      roomData({
        createdAt: createdAt as unknown as FirestoreV3RoomDoc["createdAt"],
        updatedAt: updatedAt as unknown as FirestoreV3RoomDoc["updatedAt"],
      })
    );

    expect(room.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(room.updatedAt.toISOString()).toBe("2026-01-01T00:05:00.000Z");
  });
});
