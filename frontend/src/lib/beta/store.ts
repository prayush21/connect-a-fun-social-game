import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initializeAuth } from "../firebase/config";
import {
  createRoom as fxCreateRoom,
  joinRoom as fxJoinRoom,
  leaveRoom as fxLeaveRoom,
  setSecretWord as fxSetSecretWord,
  addSignull as fxAddSignull,
  submitConnect as fxSubmitConnect,
  submitDirectGuess as fxSubmitDirectGuess,
  endGame as fxEndGame,
  updateGameSettings as fxUpdateGameSettings,
  changeSetter as fxChangeSetter,
  startGame as fxStartGame,
  playAgain as fxPlayAgain,
  backToLobby as fxBackToLobby,
  resetScoresOnly as fxResetScoresOnly,
  subscribeToRoom,
} from "./firebase";
import type {
  GameState,
  GameError,
  RoomId,
  PlayerId,
  SignullId,
  GameSettings,
  GameWinner,
} from "./types";

// Generate a random nickname
const generateRandomNickname = (): string => {
  const adjectives = [
    "Clever",
    "Swift",
    "Bright",
    "Quick",
    "Smart",
    "Bold",
    "Wise",
    "Sharp",
  ];
  const animals = [
    "Fox",
    "Eagle",
    "Wolf",
    "Tiger",
    "Bear",
    "Lion",
    "Hawk",
    "Owl",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adj}${animal}${number}`;
};

interface BetaStoreState {
  roomId: RoomId | null;
  userId: PlayerId | null;
  username: string | null;
  game: GameState | null;
  isLoading: boolean;
  error: GameError | null;
  unsubscribe: (() => void) | null;
  initialized: boolean; // first snapshot received

  // Auth Actions
  setUsername: (username: string) => void;
  generateNewUsername: () => void;
  initAuth: () => Promise<void>;

  // Game Actions
  initRoom: (
    roomId: RoomId,
    opts?: { createIfMissing?: boolean; settings?: Partial<GameSettings> }
  ) => Promise<void>;
  updateGameSettings: (settings: Partial<GameSettings>) => Promise<void>;
  changeSetter: (newSetterId: PlayerId) => Promise<void>;
  removePlayerFromRoom: (playerId: PlayerId) => Promise<void>;
  startGame: () => Promise<void>;
  playAgain: () => Promise<void>;
  backToLobby: (resetScores?: boolean) => Promise<void>;
  resetScores: () => Promise<void>;
  setSecretWord: (word: string) => Promise<void>;
  addSignull: (word: string, clue: string) => Promise<SignullId | null>;
  submitConnect: (guess: string, signullId?: SignullId) => Promise<void>;
  submitDirectGuess: (guess: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  endGame: (winner: GameWinner) => Promise<void>;
  clearError: () => void;
  setError: (error: GameError | null) => void;
  teardown: () => void;
}

function mapError(e: unknown): GameError {
  if (typeof e === "string") return { code: e, message: e };
  if (e instanceof Error) {
    const msg = e.message;
    const codeMap: Record<string, { code: string; message: string }> = {
      ROOM_NOT_FOUND: { code: "ROOM_NOT_FOUND", message: "Room not found" },
      ROOM_FULL: { code: "ROOM_FULL", message: "Room is full" },
      INVALID_PHASE: { code: "INVALID_PHASE", message: "Invalid phase" },
      SIGNULL_NOT_PENDING: {
        code: "SIGNULL_NOT_PENDING",
        message: "Signull not pending",
      },
      SIGNULL_NOT_FOUND: {
        code: "SIGNULL_NOT_FOUND",
        message: "Signull not found",
      },
      SIGNULL_ID_REQUIRED: {
        code: "SIGNULL_ID_REQUIRED",
        message: "Signull id required",
      },
      PLAYER_NOT_FOUND: {
        code: "PLAYER_NOT_FOUND",
        message: "Player not found",
      },
      ALREADY_CONNECTED: {
        code: "ALREADY_CONNECTED",
        message: "Already submitted connect",
      },
      NO_ACTIVE_SIGNULL: {
        code: "NO_ACTIVE_SIGNULL",
        message: "No active signull",
      },
      NOT_SETTER: { code: "NOT_SETTER", message: "Not the setter" },
      ONLY_GUESSER_CAN_CREATE: {
        code: "ONLY_GUESSER_CAN_CREATE",
        message: "Only a guesser can create signull",
      },
      NOT_GUESSER: { code: "NOT_GUESSER", message: "Not a guesser" },
      NO_GUESSES_LEFT: {
        code: "NO_GUESSES_LEFT",
        message: "No direct guesses left",
      },
    };
    const key = Object.keys(codeMap).find((k) => msg.includes(k));
    if (key) return codeMap[key];
    return { code: "UNKNOWN", message: msg };
  }
  return { code: "UNKNOWN", message: "Unexpected error" };
}

export const useBetaStore = create<BetaStoreState>()(
  persist(
    (set, get) => ({
      roomId: null,
      userId: null,
      username: generateRandomNickname(),
      game: null,
      isLoading: false,
      error: null,
      unsubscribe: null,
      initialized: false,

      setUsername: (username) => set({ username }),
      generateNewUsername: () => set({ username: generateRandomNickname() }),

      initAuth: async () => {
        try {
          const userId = await initializeAuth();
          if (userId) {
            set({ userId });
          } else {
            set({ userId: crypto.randomUUID() });
          }
        } catch (error) {
          console.error("Failed to initialize auth:", error);
          set({ userId: crypto.randomUUID() });
        }
      },

      clearError: () => set({ error: null }),
      setError: (error: GameError | null) => set({ error }),

      teardown: () => {
        const unsub = get().unsubscribe;
        if (unsub) {
          try {
            unsub();
          } catch {
            /* ignore */
          }
        }
        set({
          roomId: null,
          // Keep userId and username
          game: null,
          unsubscribe: null,
          initialized: false,
          isLoading: false,
        });
      },

      initRoom: async (roomId, opts) => {
        const { userId, username } = get();
        if (!userId || !username) {
          set({
            error: {
              code: "AUTH_REQUIRED",
              message: "User not authenticated or nickname missing",
            },
          });
          return;
        }

        if (get().unsubscribe) get().teardown();
        set({ isLoading: true, error: null, roomId });
        const createIfMissing = opts?.createIfMissing ?? false;
        try {
          if (createIfMissing) {
            await fxCreateRoom(roomId, userId, username, opts?.settings);
          } else {
            // Attempt join; if fails with ROOM_NOT_FOUND and createIfMissing not set → error
            try {
              await fxJoinRoom(roomId, userId, username);
            } catch (e) {
              const mapped = mapError(e);
              if (mapped.code === "ROOM_NOT_FOUND") throw e;
            }
          }
        } catch (e) {
          set({ error: mapError(e), isLoading: false });
          return;
        }

        const unsub = subscribeToRoom(roomId, (state, subError) => {
          if (subError) {
            set({ error: subError });
            return;
          }
          set((prev) => ({
            game: state,
            initialized: true,
            isLoading:
              prev.isLoading && !prev.initialized ? false : prev.isLoading,
          }));
        });
        set({ unsubscribe: unsub });
      },

      setSecretWord: async (word) => {
        const { roomId, userId, game } = get();
        if (!roomId || !userId || !game) return;
        set({ isLoading: true });
        try {
          await fxSetSecretWord(roomId, userId, word);
        } catch (e) {
          set({ error: mapError(e) });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      addSignull: async (word, clue) => {
        const { roomId, userId, game } = get();
        if (!roomId || !userId || !game) return null;
        set({ isLoading: true });
        try {
          const id = await fxAddSignull(roomId, userId, word, clue);
          return id;
        } catch (e) {
          set({ error: mapError(e) });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      submitConnect: async (guess, signullId) => {
        const { roomId, userId, game } = get();
        if (!roomId || !userId || !game) return;
        set({ isLoading: true });
        try {
          await fxSubmitConnect(roomId, userId, signullId, guess);
        } catch (e) {
          set({ error: mapError(e) });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      submitDirectGuess: async (guess) => {
        const { roomId, userId, game } = get();
        if (!roomId || !userId || !game) return;
        set({ isLoading: true });
        try {
          await fxSubmitDirectGuess(roomId, userId, guess);
        } catch (e) {
          set({ error: mapError(e) });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      leaveRoom: async () => {
        const { roomId, userId } = get();
        if (!roomId || !userId) return;
        set({ isLoading: true });
        try {
          await fxLeaveRoom(roomId, userId);
          get().teardown();
        } catch (e) {
          set({ error: mapError(e) });
        } finally {
          set({ isLoading: false });
        }
      },

      endGame: async (winner) => {
        const { roomId, userId } = get();
        if (!roomId || !userId) return;
        set({ isLoading: true });
        try {
          await fxEndGame(roomId, winner);
        } catch (e) {
          set({ error: mapError(e) });
        } finally {
          set({ isLoading: false });
        }
      },

      updateGameSettings: async (settings) => {
        const { roomId } = get();
        if (!roomId) return;
        try {
          await fxUpdateGameSettings(roomId, settings);
        } catch (e) {
          set({ error: mapError(e) });
        }
      },
      changeSetter: async (newSetterId) => {
        const { roomId } = get();
        if (!roomId) return;
        try {
          await fxChangeSetter(roomId, newSetterId);
        } catch (e) {
          set({ error: mapError(e) });
        }
      },
      removePlayerFromRoom: async (playerId) => {
        const { roomId } = get();
        if (!roomId) return;
        try {
          await fxLeaveRoom(roomId, playerId);
        } catch (e) {
          set({ error: mapError(e) });
        }
      },
      startGame: async () => {
        const { roomId } = get();
        if (!roomId) return;
        try {
          await fxStartGame(roomId);
        } catch (e) {
          set({ error: mapError(e) });
        }
      },
      playAgain: async () => {
        const { roomId } = get();
        if (!roomId) return;
        try {
          await fxPlayAgain(roomId);
        } catch (e) {
          set({ error: mapError(e) });
        }
      },
      backToLobby: async (resetScores?: boolean) => {
        const { roomId } = get();
        if (!roomId) return;
        try {
          await fxBackToLobby(roomId, resetScores);
        } catch (e) {
          set({ error: mapError(e) });
        }
      },
      resetScores: async () => {
        const { roomId } = get();
        if (!roomId) return;
        try {
          await fxResetScoresOnly(roomId);
        } catch (e) {
          set({ error: mapError(e) });
        }
      },
    }),
    {
      name: "beta-store",
      partialize: (state) => ({
        username: state.username,
        userId: state.userId,
        roomId: state.roomId,
      }),
    }
  )
);

export type { BetaStoreState };
