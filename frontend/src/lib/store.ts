import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GameState,
  UiState as UiStateType,
  AuthState as AuthStateType,
  PlayerId,
  RoomId,
  GameError,
} from "./types";
import {
  subscribeToGameRoom,
  createRoom as createGameRoom,
  joinRoom as joinGameRoom,
  leaveRoom,
  returnToLobby as returnToLobbyFirebase,
  setSecretWord,
  setReference as setGameReference,
  submitGuess as submitGameGuess,
  submitDirectGuess as submitGameDirectGuess,
  submitSetterGuess as submitGameSetterGuess,
  updateGameSettings as updateSettings,
  removePlayer,
  changeSetter,
  volunteerAsClueGiver,
  startGameRound,
  generateRoomCode,
} from "./firebase";
import { initializeAuth, logAnalyticsEvent } from "./firebase/config";
import { getOrderedGuesserIds } from "./game-logic";
import { withErrorHandling, ERROR_CODES, createGameError } from "./errors";
import {
  validateSecretWord,
  validateReferenceWord,
  validateDirectGuess,
  canSetWord,
  canRemovePlayer,
  canChangeRole,
  resolveDirectGuess,
} from "./game-logic";
import {
  getNotificationManager,
  initializeNotifications,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "./notifications";
import type { Unsubscribe } from "firebase/firestore";

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

// UI State interface
export interface UiState extends UiStateType {
  // setTheme removed - light mode only for now
  openModal: (modal: keyof UiStateType["modals"]) => void;
  closeModal: (modal: keyof UiStateType["modals"]) => void;
  openEndRound: () => void;
  closeEndRound: () => void;
}

// Auth State interface
export interface AuthState extends AuthStateType {
  setUsername: (username: string) => void;
  generateNewUsername: () => void;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (
    preferences: Partial<NotificationPreferences>
  ) => void;
  initializeNotifications: () => void;
}

// Game State interface
export interface GameStateStore {
  // Core game state
  gameState: GameState | null;
  roomId: RoomId | null;

  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: GameError | null;
  connectionRetries: number;
  lastSyncTime: number | null;

  // Optimistic updates
  pendingActions: Map<
    string,
    { action: string; timestamp: number; data: unknown }
  >;
  optimisticState: Partial<GameState> | null;

  // Subscription management
  unsubscribe: Unsubscribe | null;

  // Actions
  createRoom: (username: string) => Promise<void>;
  joinRoom: (roomId: RoomId, username: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  returnToLobby: () => Promise<void>;
  setWord: (word: string) => Promise<void>;
  setReference: (referenceWord: string, clue: string) => Promise<void>;
  submitGuess: (guess: string) => Promise<void>;
  submitDirectGuess: (word: string) => Promise<void>;
  submitSetterGuess: (guess: string) => Promise<void>;
  updateGameSettings: (
    settings: Partial<GameState["settings"]>
  ) => Promise<void>;
  removePlayer: (playerId: PlayerId) => Promise<void>;
  changeSetter: (playerId: PlayerId) => Promise<void>;
  volunteerAsClueGiver: () => Promise<void>;

  // Convenience aliases for lobby components
  startGame: () => Promise<void>;
  removePlayerFromRoom: (playerId: PlayerId) => Promise<void>;
  changePlayerRole: (
    playerId: PlayerId,
    role: "setter" | "guesser"
  ) => Promise<void>;

  // State management
  setRoomId: (id: RoomId | null) => void;
  setGameState: (state: GameState | null) => void;
  setError: (error: GameError | null) => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;

  // Optimistic updates
  addPendingAction: (id: string, action: string, data: unknown) => void;
  removePendingAction: (id: string) => void;
  clearPendingActions: () => void;
  applyOptimisticUpdate: (update: Partial<GameState>) => void;
  clearOptimisticState: () => void;

  // Connection management
  incrementRetries: () => void;
  resetRetries: () => void;
  updateLastSync: () => void;
  reconnect: () => Promise<void>;

  // Cleanup
  cleanup: () => void;

  // Auth initialization
  initAuth: () => Promise<void>;

  // Notification helpers
  checkForNewReferenceNotification: (newGameState: GameState) => Promise<void>;
}

export const useStore = create<UiState & AuthState & GameStateStore>()(
  persist(
    (set, get) => ({
      // UI State (theme removed - light mode only)
      modals: { endRound: false, info: false, feedback: false },
      openModal: (modal) =>
        set((s) => ({ modals: { ...s.modals, [modal]: true } })),
      closeModal: (modal) =>
        set((s) => ({ modals: { ...s.modals, [modal]: false } })),
      openEndRound: () =>
        set((s) => ({ modals: { ...s.modals, endRound: true } })),
      closeEndRound: () =>
        set((s) => ({ modals: { ...s.modals, endRound: false } })),

      // Auth State
      username: generateRandomNickname(),
      sessionId: "", // Will be set after authentication
      notificationPreferences: {
        audioEnabled: true,
        vibrationEnabled: true,
        volume: 0.7,
      },
      setUsername: (username) => set({ username }),
      generateNewUsername: () => set({ username: generateRandomNickname() }),
      updateNotificationPreferences: (preferences) => {
        const newPrefs = { ...get().notificationPreferences, ...preferences };
        set({ notificationPreferences: newPrefs });
        updateNotificationPreferences(preferences);
      },
      initializeNotifications: () => {
        const { notificationPreferences } = get();
        initializeNotifications(notificationPreferences);
      },

      // Initialize authentication
      async initAuth() {
        try {
          const userId = await initializeAuth();
          if (userId) {
            set({ sessionId: userId });
            await logAnalyticsEvent("app_session", { timestamp: Date.now() });
          } else {
            // Fallback to random UUID if auth fails
            set({ sessionId: crypto.randomUUID() });
          }
        } catch (error) {
          console.error("Failed to initialize auth:", error);
          // Fallback to random UUID if auth fails
          set({ sessionId: crypto.randomUUID() });
        }
      },

      // Game State
      gameState: null,
      roomId: null,
      isConnected: false,
      isLoading: false,
      error: null,
      connectionRetries: 0,
      lastSyncTime: null,
      pendingActions: new Map(),
      optimisticState: null,
      unsubscribe: null,

      // Actions
      async createRoom(username: string) {
        const { error } = await withErrorHandling(async () => {
          set({ isLoading: true, error: null });

          const roomCode = generateRoomCode();
          const { sessionId } = get();
          const actionId = `create_room_${Date.now()}`;

          // Add optimistic action
          get().addPendingAction(actionId, "CREATE_ROOM", {
            roomCode,
            username,
          });

          // Apply optimistic update
          get().applyOptimisticUpdate({
            roomId: roomCode,
            gamePhase: "lobby",
            players: {
              [sessionId]: {
                id: sessionId,
                name: username,
                role: "setter",
                isOnline: true,
                lastActive: new Date(),
              },
            },
          });

          await createGameRoom(roomCode, sessionId, username);

          // Subscribe to the room with enhanced error handling
          const unsubscribe = subscribeToGameRoom(roomCode, (gameState) => {
            if (gameState) {
              // Check for new reference notifications (only if not the clue giver)
              get().checkForNewReferenceNotification(gameState);

              get().removePendingAction(actionId);
              get().clearOptimisticState();
              get().resetRetries();
              get().updateLastSync();
              set({ gameState, isConnected: true });
            } else {
              set({ isConnected: false });
              get().incrementRetries();
            }
          });

          set({
            roomId: roomCode,
            unsubscribe,
            isLoading: false,
            isConnected: true,
          });
        }, "createRoom");

        if (error) {
          get().clearPendingActions();
          get().clearOptimisticState();
          set({ error, isLoading: false });
          throw error;
        }
      },

      async joinRoom(roomId: RoomId, username: string) {
        const { error } = await withErrorHandling(async () => {
          set({ isLoading: true, error: null });

          // Normalize room code: trim and convert to uppercase
          const normalizedRoomId = roomId.trim().toUpperCase();

          const { sessionId } = get();
          const actionId = `join_room_${Date.now()}`;

          // Add optimistic action
          get().addPendingAction(actionId, "JOIN_ROOM", { roomId: normalizedRoomId, username });

          await joinGameRoom(normalizedRoomId, sessionId, username);

          // Subscribe to the room with enhanced error handling
          const unsubscribe = subscribeToGameRoom(normalizedRoomId, (gameState) => {
            if (gameState) {
              // Check for new reference notifications (only if not the clue giver)
              get().checkForNewReferenceNotification(gameState);

              get().removePendingAction(actionId);
              get().clearOptimisticState();
              get().resetRetries();
              get().updateLastSync();
              set({ gameState, isConnected: true });
            } else {
              set({ isConnected: false });
              get().incrementRetries();
            }
          });

          set({
            roomId: normalizedRoomId,
            unsubscribe,
            isLoading: false,
            isConnected: true,
          });
        }, "joinRoom");

        if (error) {
          get().clearPendingActions();
          get().clearOptimisticState();
          set({ error, isLoading: false });
          throw error;
        }
      },

      async leaveRoom() {
        const { roomId: currentRoomId, sessionId, unsubscribe } = get();

        if (!currentRoomId) return;

        const { error } = await withErrorHandling(async () => {
          await leaveRoom(currentRoomId, sessionId);

          // Cleanup subscription
          if (unsubscribe) {
            unsubscribe();
          }

          set({
            roomId: null,
            gameState: null,
            unsubscribe: null,
            isConnected: false,
            error: null,
          });
        }, "leaveRoom");

        if (error) {
          set({ error });
          throw error;
        }
      },

      async returnToLobby() {
        const { roomId: currentRoomId, gameState } = get();

        if (!currentRoomId || !gameState) return;

        const { error } = await withErrorHandling(async () => {
          // Check if game is actually ended
          if (gameState.gamePhase !== "ended") {
            throw createGameError(
              ERROR_CODES.INVALID_GAME_PHASE,
              "Can only return to lobby from ended games"
            );
          }

          const actionId = `return_to_lobby_${Date.now()}`;

          // Add optimistic action
          get().addPendingAction(actionId, "RETURN_TO_LOBBY", {});

          // Apply optimistic update - transition back to lobby
          get().applyOptimisticUpdate({
            gamePhase: "lobby",
            secretWord: "",
            revealedCount: 1,
            clueGiverTurn: 0,
            directGuessesLeft: 3,
            currentReference: null,
            winner: null,
          });

          await returnToLobbyFirebase(currentRoomId);

          // Remove pending action after successful operation
          setTimeout(() => get().removePendingAction(actionId), 1000);
        }, "returnToLobby");

        if (error) {
          get().clearPendingActions();
          get().clearOptimisticState();
          set({ error });
          throw error;
        }
      },

      async setWord(word: string) {
        const { roomId: currentRoomId, sessionId, gameState } = get();
        if (!currentRoomId || !gameState) return;

        const { error } = await withErrorHandling(async () => {
          // Validate word format
          const wordValidation = validateSecretWord(word);
          if (!wordValidation.isValid) {
            throw createGameError(
              ERROR_CODES.INVALID_WORD,
              wordValidation.error || "Invalid word"
            );
          }

          // Check if player can set word
          const canSetValidation = canSetWord(gameState, sessionId);
          if (!canSetValidation.canSet) {
            throw createGameError(
              ERROR_CODES.INVALID_GAME_PHASE,
              canSetValidation.error || "Cannot set word"
            );
          }

          const actionId = `set_word_${Date.now()}`;

          // Add optimistic action
          get().addPendingAction(actionId, "SET_WORD", { word });

          // Apply optimistic update
          get().applyOptimisticUpdate({
            secretWord: word.toUpperCase(),
            gamePhase: "guessing",
            revealedCount: 1,
            directGuessesLeft: 3,
            currentReference: null,
            clueGiverTurn: 0,
          });

          await setSecretWord(currentRoomId, word);

          // Remove pending action after successful operation
          setTimeout(() => get().removePendingAction(actionId), 1000);
        }, "setWord");

        if (error) {
          get().clearPendingActions();
          get().clearOptimisticState();
          set({ error });
          throw error;
        }
      },

      async setReference(referenceWord: string, clue: string) {
        const { roomId: currentRoomId, sessionId, gameState } = get();
        if (!currentRoomId || !gameState) return;

        const { error } = await withErrorHandling(async () => {
          // Validate reference word
          const referenceValidation = validateReferenceWord(
            referenceWord,
            gameState.secretWord,
            gameState.revealedCount
          );
          if (!referenceValidation.isValid) {
            throw createGameError(
              ERROR_CODES.INVALID_PREFIX,
              referenceValidation.error || "Invalid reference word"
            );
          }

          // Validate clue
          if (!clue.trim()) {
            throw createGameError(
              ERROR_CODES.INVALID_CLUE,
              "Clue cannot be empty"
            );
          }

          // Check if this is a climactic round
          const isClimactic =
            referenceWord.toLowerCase() === gameState.secretWord.toLowerCase();

          const actionId = `set_reference_${Date.now()}`;

          // Add optimistic action
          get().addPendingAction(actionId, "SET_REFERENCE", {
            referenceWord,
            clue,
          });

          // Apply optimistic update
          get().applyOptimisticUpdate({
            currentReference: {
              clueGiverId: sessionId,
              referenceWord: referenceWord.toLowerCase(),
              clue,
              guesses: {},
              setterAttempt: "",
              isClimactic,
              timestamp: new Date(),
            },
          });

          await setGameReference(currentRoomId, sessionId, referenceWord, clue);

          // Remove pending action after successful operation
          setTimeout(() => get().removePendingAction(actionId), 1000);
        }, "setReference");

        if (error) {
          get().clearPendingActions();
          get().clearOptimisticState();
          set({ error });
          throw error;
        }
      },

      async submitGuess(guess: string) {
        const { roomId: currentRoomId, sessionId, gameState } = get();
        if (!currentRoomId || !gameState?.currentReference) return;

        const { error } = await withErrorHandling(async () => {
          const actionId = `submit_guess_${Date.now()}`;

          // Add optimistic action
          get().addPendingAction(actionId, "SUBMIT_GUESS", { guess });

          // Apply optimistic update
          if (gameState.currentReference) {
            get().applyOptimisticUpdate({
              currentReference: {
                ...gameState.currentReference,
                guesses: {
                  ...gameState.currentReference.guesses,
                  [sessionId]: guess.toUpperCase(),
                },
              },
            });
          }

          try {
            await submitGameGuess(currentRoomId, sessionId, guess);
          } catch (err) {
            // Check if this is a ROUND_ENDED error
            if (err instanceof Error && err.message.includes("ROUND_ENDED")) {
              // Clear pending actions and optimistic state
              get().removePendingAction(actionId);
              get().clearOptimisticState();
              
              // Set a friendly error message but don't throw
              set({
                error: createGameError(
                  ERROR_CODES.ROUND_ENDED,
                  "This round has already been completed. Your guess was not needed."
                ),
              });
              
              // Clear the error after 3 seconds
              setTimeout(() => {
                if (get().error?.code === ERROR_CODES.ROUND_ENDED) {
                  set({ error: null });
                }
              }, 3000);
              
              return; // Exit gracefully
            }
            // Re-throw other errors
            throw err;
          }

          // Remove pending action after successful operation
          setTimeout(() => get().removePendingAction(actionId), 1000);
        }, "submitGuess");

        if (error) {
          get().clearPendingActions();
          get().clearOptimisticState();
          set({ error });
          throw error;
        }
      },

      async submitDirectGuess(word: string) {
        const { roomId: currentRoomId, sessionId, gameState } = get();
        if (!currentRoomId || !gameState) return;

        const { error } = await withErrorHandling(async () => {
          // Validate direct guess
          const guessValidation = validateDirectGuess(
            word,
            gameState.secretWord,
            gameState.revealedCount
          );
          if (!guessValidation.isValid) {
            throw createGameError(
              ERROR_CODES.INVALID_GUESS,
              guessValidation.error || "Invalid guess"
            );
          }

          // Check if any direct guesses are left
          if (gameState.directGuessesLeft <= 0) {
            throw createGameError(
              ERROR_CODES.NO_GUESSES_LEFT,
              "No direct guesses remaining"
            );
          }

          // Calculate the result of this guess
          const guessResult = resolveDirectGuess(gameState, word, sessionId);

          // Apply optimistic update based on the result
          const optimisticUpdate: Partial<GameState> = {
            directGuessesLeft: guessResult.newDirectGuessesLeft,
          };

          if (guessResult.winner) {
            optimisticUpdate.gamePhase = "ended";
            optimisticUpdate.winner = guessResult.winner;
          }

          get().applyOptimisticUpdate(optimisticUpdate);

          await submitGameDirectGuess(currentRoomId, sessionId, word);
          await logAnalyticsEvent("direct_guess_submitted", {
            room_id: currentRoomId,
            word_length: word.length,
          });
        }, "submitDirectGuess");

        if (error) {
          get().clearOptimisticState();
          set({ error });
          throw error;
        }
      },

      async updateGameSettings(settings) {
        const { roomId: currentRoomId } = get();
        if (!currentRoomId) return;

        const { error } = await withErrorHandling(async () => {
          await updateSettings(currentRoomId, settings);
        }, "updateGameSettings");

        if (error) {
          set({ error });
          throw error;
        }
      },

      async removePlayer(playerId: PlayerId) {
        const { roomId: currentRoomId, sessionId, gameState } = get();
        if (!currentRoomId || !gameState) return;

        const { error } = await withErrorHandling(async () => {
          // Validate removal permissions
          const canRemoveValidation = canRemovePlayer(
            gameState,
            sessionId,
            playerId
          );
          if (!canRemoveValidation.canRemove) {
            throw createGameError(
              ERROR_CODES.UNAUTHORIZED_ACTION,
              canRemoveValidation.error || "Cannot remove player"
            );
          }

          await removePlayer(currentRoomId, playerId);
        }, "removePlayer");

        if (error) {
          set({ error });
          throw error;
        }
      },

      async changeSetter(playerId: PlayerId) {
        const { roomId: currentRoomId, sessionId, gameState } = get();
        if (!currentRoomId || !gameState) return;

        const { error } = await withErrorHandling(async () => {
          // Validate role change permissions
          const canChangeValidation = canChangeRole(
            gameState,
            sessionId,
            playerId,
            "setter"
          );
          if (!canChangeValidation.canChange) {
            throw createGameError(
              ERROR_CODES.UNAUTHORIZED_ACTION,
              canChangeValidation.error || "Cannot change role"
            );
          }

          await changeSetter(currentRoomId, playerId, sessionId);
        }, "changeSetter");

        if (error) {
          set({ error });
          throw error;
        }
      },

      async submitSetterGuess(guess: string) {
        const { roomId: currentRoomId, sessionId, gameState } = get();
        if (!currentRoomId || !gameState?.currentReference) return;

        const { error } = await withErrorHandling(async () => {
          const actionId = `submit_setter_guess_${Date.now()}`;

          // Add optimistic action
          get().addPendingAction(actionId, "SUBMIT_SETTER_GUESS", { guess });

          // Apply optimistic update - setter attempts go to setterAttempt field, not guesses
          if (gameState.currentReference) {
            get().applyOptimisticUpdate({
              currentReference: {
                ...gameState.currentReference,
                setterAttempt: guess.toLowerCase(),
              },
            });
          }

          try {
            await submitGameSetterGuess(currentRoomId, sessionId, guess);
          } catch (err) {
            // Check if this is a ROUND_ENDED error
            if (err instanceof Error && err.message.includes("ROUND_ENDED")) {
              // Clear pending actions and optimistic state
              get().removePendingAction(actionId);
              get().clearOptimisticState();
              
              // Set a friendly error message but don't throw
              set({
                error: createGameError(
                  ERROR_CODES.ROUND_ENDED,
                  "This round has already been completed. Your sabotage was not needed."
                ),
              });
              
              // Clear the error after 3 seconds
              setTimeout(() => {
                if (get().error?.code === ERROR_CODES.ROUND_ENDED) {
                  set({ error: null });
                }
              }, 3000);
              
              return; // Exit gracefully
            }
            // Re-throw other errors
            throw err;
          }

          // Remove pending action after successful operation
          setTimeout(() => get().removePendingAction(actionId), 1000);
        }, "submitSetterGuess");

        if (error) {
          get().clearPendingActions();
          get().clearOptimisticState();
          set({ error });
          throw error;
        }
      },

      async volunteerAsClueGiver() {
        const { roomId: currentRoomId, sessionId, gameState } = get();
        if (!currentRoomId || !gameState) return;

        const { error } = await withErrorHandling(async () => {
          // Validate that user is a guesser
          const currentPlayer = gameState.players[sessionId];
          if (!currentPlayer) {
            throw createGameError(
              ERROR_CODES.UNAUTHORIZED_ACTION,
              "Player not found"
            );
          }

          if (currentPlayer.role !== "guesser") {
            throw createGameError(
              ERROR_CODES.UNAUTHORIZED_ACTION,
              "Only guessers can volunteer to be clue giver"
            );
          }

          if (gameState.gamePhase !== "guessing") {
            throw createGameError(
              ERROR_CODES.INVALID_GAME_PHASE,
              "Can only volunteer during guessing phase"
            );
          }

          await volunteerAsClueGiver(currentRoomId, sessionId);
        }, "volunteerAsClueGiver");

        if (error) {
          set({ error });
          throw error;
        }
      },

      // Convenience aliases for lobby components
      async startGame() {
        const { roomId: currentRoomId, gameState } = get();
        if (!currentRoomId || !gameState || gameState.gamePhase !== "lobby")
          return;

        const { error } = await withErrorHandling(async () => {
          // Transition to setting_word phase
          await startGameRound(currentRoomId);
        }, "startGame");

        if (error) {
          set({ error });
          throw error;
        }
      },

      async removePlayerFromRoom(playerId: PlayerId) {
        return get().removePlayer(playerId);
      },

      async changePlayerRole(playerId: PlayerId, role: "setter" | "guesser") {
        if (role === "setter") {
          return get().changeSetter(playerId);
        }
        // For changing to guesser, we need to set someone else as setter first
        // This is handled by the UI flow in the role selection modal
      },

      // State management
      setRoomId: (id) => set({ roomId: id }),
      setGameState: (state) => set({ gameState: state }),
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      setConnected: (connected) => set({ isConnected: connected }),

      // Optimistic updates
      addPendingAction: (id, action, data) =>
        set((state) => {
          const newPendingActions = new Map(state.pendingActions);
          newPendingActions.set(id, { action, timestamp: Date.now(), data });
          return { pendingActions: newPendingActions };
        }),

      removePendingAction: (id) =>
        set((state) => {
          const newPendingActions = new Map(state.pendingActions);
          newPendingActions.delete(id);
          return { pendingActions: newPendingActions };
        }),

      clearPendingActions: () => set({ pendingActions: new Map() }),

      applyOptimisticUpdate: (update) =>
        set((state) => ({
          optimisticState: { ...state.optimisticState, ...update },
        })),

      clearOptimisticState: () => set({ optimisticState: null }),

      // Connection management
      incrementRetries: () =>
        set((state) => ({ connectionRetries: state.connectionRetries + 1 })),

      resetRetries: () => set({ connectionRetries: 0 }),

      updateLastSync: () => set({ lastSyncTime: Date.now() }),

      async reconnect() {
        const { roomId } = get();
        if (!roomId) return;

        const { error } = await withErrorHandling(async () => {
          set({ isLoading: true, error: null });

          // Resubscribe to the room
          const unsubscribe = subscribeToGameRoom(roomId, (gameState) => {
            if (gameState) {
              get().resetRetries();
              get().updateLastSync();
              set({ gameState, isConnected: true });
            } else {
              set({ isConnected: false });
              get().incrementRetries();
            }
          });

          set({
            unsubscribe,
            isLoading: false,
            isConnected: true,
          });
        }, "reconnect");

        if (error) {
          set({ error, isLoading: false });
          throw error;
        }
      },

      // Cleanup
      cleanup() {
        const { unsubscribe } = get();
        if (unsubscribe) {
          unsubscribe();
        }
        set({
          gameState: null,
          roomId: null,
          unsubscribe: null,
          isConnected: false,
          error: null,
          connectionRetries: 0,
          lastSyncTime: null,
          pendingActions: new Map(),
          optimisticState: null,
        });
      },

      // Notification helpers
      async checkForNewReferenceNotification(newGameState: GameState) {
        const {
          gameState: currentGameState,
          sessionId,
          notificationPreferences,
        } = get();

        // Only check if we have a previous game state to compare against
        if (!currentGameState) return;

        // Check if a new reference was added
        const hadReference = !!currentGameState.currentReference;
        const hasReference = !!newGameState.currentReference;

        if (!hadReference && hasReference) {
          // New reference was added
          const newReference = newGameState.currentReference!;

          // Don't notify the clue giver who submitted the reference
          if (newReference.clueGiverId === sessionId) return;

          // Trigger notification
          try {
            const manager = getNotificationManager(notificationPreferences);
            await manager.notify("new_reference");
          } catch (error) {
            console.warn("Failed to trigger notification:", error);
          }
        }
      },
    }),
    {
      name: "connect-game-storage",
      partialize: (state) => ({
        username: state.username,
        sessionId: state.sessionId,
        notificationPreferences: state.notificationPreferences,
        // theme removed - light mode only
      }),
    }
  )
);

// Derived state selectors with optimistic updates
export const useGameSelectors = () => {
  const gameState = useStore((state) => state.gameState);
  const optimisticState = useStore((state) => state.optimisticState);
  const sessionId = useStore((state) => state.sessionId);
  const pendingActions = useStore((state) => state.pendingActions);
  const isConnected = useStore((state) => state.isConnected);
  const connectionRetries = useStore((state) => state.connectionRetries);

  // Merge game state with optimistic updates
  const effectiveGameState = gameState
    ? { ...gameState, ...optimisticState }
    : null;

  if (!effectiveGameState) {
    return {
      activeGuessers: [],
      currentPlayer: null,
      isMyTurn: false,
      canSubmitDirectGuess: false,
      canSubmitReference: false,
      revealedPrefix: "",
      majorityNeeded: 0,
      guessesReceived: 0,
      hasPendingActions: pendingActions.size > 0,
      isConnected,
      connectionRetries,
    };
  }

  // const players = Object.values(effectiveGameState.players); // Not used, commenting out

  // CRITICAL: Use the same ordered guesser list that clueGiverTurn index is based on
  // This ensures consistent clue giver calculation across all components
  const orderedGuesserIds = getOrderedGuesserIds(effectiveGameState.players);
  const allGuessers = orderedGuesserIds
    .map((id) => effectiveGameState.players[id])
    .filter((p) => p);
  const activeGuessers = allGuessers.filter((p) => p.isOnline); // Only online guessers for UI

  const currentPlayer = effectiveGameState.players[sessionId] || null;

  // Find current clue giver using the FULL ordered list (not just online players)
  const currentClueGiver =
    allGuessers[effectiveGameState.clueGiverTurn] || null;

  const isMyTurn =
    effectiveGameState.gamePhase === "guessing" &&
    currentClueGiver?.id === sessionId;

  const canSubmitDirectGuess =
    effectiveGameState.gamePhase === "guessing" &&
    currentPlayer?.role === "guesser" &&
    effectiveGameState.directGuessesLeft > 0 &&
    isConnected;

  const canSubmitReference =
    effectiveGameState.gamePhase === "guessing" &&
    isMyTurn &&
    !effectiveGameState.currentReference &&
    isConnected;

  const revealedPrefix = effectiveGameState.secretWord.slice(
    0,
    effectiveGameState.revealedCount
  );
  // Eligible active guessers exclude the current clue giver
  const eligibleActiveGuessers = activeGuessers.filter(
    (guesser) => guesser.id !== currentClueGiver?.id
  );
  const maxEligible = Math.max(eligibleActiveGuessers.length, 1);
  // Interpret legacy percent values (>100) as percentage and convert to count
  const rawThreshold = effectiveGameState.settings.majorityThreshold || 1;
  const interpretedThreshold =
    rawThreshold;
  const majorityNeeded = Math.max(1, Math.min(interpretedThreshold, maxEligible));
  const guessesReceived = effectiveGameState.currentReference
    ? activeGuessers.filter(
        (guesser) =>
          guesser.id !== effectiveGameState.currentReference?.clueGiverId &&
          effectiveGameState.currentReference?.guesses[guesser.id]
      ).length
    : 0;

  // Check if volunteer button should be shown
  const canVolunteerAsClueGiver =
    effectiveGameState.gamePhase === "guessing" &&
    currentPlayer?.role === "guesser" &&
    !currentClueGiver &&
    !effectiveGameState.currentReference &&
    isConnected;

  return {
    activeGuessers,
    currentPlayer,
    currentClueGiver,
    isMyTurn,
    canSubmitDirectGuess,
    canSubmitReference,
    canVolunteerAsClueGiver,
    revealedPrefix,
    majorityNeeded,
    guessesReceived,
    hasPendingActions: pendingActions.size > 0,
    isConnected,
    connectionRetries,
    gamePhase: effectiveGameState.gamePhase,
    isRoomCreator: effectiveGameState.setterUid === sessionId,
  };
};
