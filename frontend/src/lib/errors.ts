import React from "react";
import type { GameError } from "./types";

// Error codes for different types of game errors
export const ERROR_CODES = {
  // Network/Connection errors
  NETWORK_ERROR: "NETWORK_ERROR",
  OFFLINE: "OFFLINE",
  CONNECTION_LOST: "CONNECTION_LOST",

  // Room/Game errors
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_FULL: "ROOM_FULL",
  GAME_ENDED: "GAME_ENDED",
  INVALID_GAME_PHASE: "INVALID_GAME_PHASE",

  // Player errors
  PLAYER_NOT_FOUND: "PLAYER_NOT_FOUND",
  UNAUTHORIZED_ACTION: "UNAUTHORIZED_ACTION",
  INVALID_ROLE: "INVALID_ROLE",

  // Validation errors
  INVALID_WORD: "INVALID_WORD",
  INVALID_PREFIX: "INVALID_PREFIX",
  INVALID_CLUE: "INVALID_CLUE",
  INVALID_GUESS: "INVALID_GUESS",

  // Game logic errors
  NO_GUESSES_LEFT: "NO_GUESSES_LEFT",
  REFERENCE_IN_PROGRESS: "REFERENCE_IN_PROGRESS",
  NOT_YOUR_TURN: "NOT_YOUR_TURN",
  ROUND_ENDED: "ROUND_ENDED",

  // System errors
  FIREBASE_ERROR: "FIREBASE_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Error message mapping
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.NETWORK_ERROR]:
    "Network connection failed. Please check your internet connection.",
  [ERROR_CODES.OFFLINE]:
    "You're currently offline. Please check your internet connection.",
  [ERROR_CODES.CONNECTION_LOST]:
    "Connection to the game server was lost. Attempting to reconnect...",

  [ERROR_CODES.ROOM_NOT_FOUND]:
    "Game room not found. It may have ended or the code is incorrect.",
  [ERROR_CODES.ROOM_FULL]:
    "This game room is full. Try joining a different room.",
  [ERROR_CODES.GAME_ENDED]: "This game has already ended.",
  [ERROR_CODES.INVALID_GAME_PHASE]:
    "This action is not allowed in the current game phase.",

  [ERROR_CODES.PLAYER_NOT_FOUND]: "Player not found in this game room.",
  [ERROR_CODES.UNAUTHORIZED_ACTION]:
    "You don't have permission to perform this action.",
  [ERROR_CODES.INVALID_ROLE]: "Invalid player role for this action.",

  [ERROR_CODES.INVALID_WORD]:
    "Invalid word. Please use only letters and ensure it meets length requirements.",
  [ERROR_CODES.INVALID_PREFIX]: "Word must start with the revealed prefix.",
  [ERROR_CODES.INVALID_CLUE]:
    "Invalid clue. Please ensure it meets the requirements.",
  [ERROR_CODES.INVALID_GUESS]: "Invalid guess. Please use only letters.",

  [ERROR_CODES.NO_GUESSES_LEFT]: "No direct guesses remaining for your team.",
  [ERROR_CODES.REFERENCE_IN_PROGRESS]:
    "A reference round is already in progress.",
  [ERROR_CODES.NOT_YOUR_TURN]: "It's not your turn to give a clue.",
  [ERROR_CODES.ROUND_ENDED]:
    "This round has already been completed by another player.",

  [ERROR_CODES.FIREBASE_ERROR]: "Database error occurred. Please try again.",
  [ERROR_CODES.VALIDATION_ERROR]:
    "Input validation failed. Please check your input.",
  [ERROR_CODES.UNKNOWN_ERROR]:
    "An unexpected error occurred. Please try again.",
};

// Create a standardized game error
export const createGameError = (
  code: ErrorCode,
  customMessage?: string,
  details?: Record<string, unknown>
): GameError => ({
  code,
  message: customMessage || ERROR_MESSAGES[code],
  details,
});

// Error handling utilities
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes("network") ||
      error.message.includes("offline") ||
      error.message.includes("fetch")
    );
  }
  return false;
};

export const isFirebaseError = (error: unknown): error is { code: string } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith("firestore/")
  );
};

export const parseFirebaseError = (error: unknown): GameError => {
  if (!isFirebaseError(error)) {
    return createGameError(ERROR_CODES.UNKNOWN_ERROR);
  }

  const firebaseError = error as { code: string; message: string };

  switch (firebaseError.code) {
    case "firestore/permission-denied":
      return createGameError(ERROR_CODES.UNAUTHORIZED_ACTION);
    case "firestore/not-found":
      return createGameError(ERROR_CODES.ROOM_NOT_FOUND);
    case "firestore/unavailable":
      return createGameError(ERROR_CODES.CONNECTION_LOST);
    default:
      return createGameError(ERROR_CODES.FIREBASE_ERROR, firebaseError.message);
  }
};

// Async error wrapper
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: GameError }> => {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    console.error(`Error in ${context || "operation"}:`, error);

    if (isFirebaseError(error)) {
      return { error: parseFirebaseError(error) };
    }

    if (isNetworkError(error)) {
      return { error: createGameError(ERROR_CODES.NETWORK_ERROR) };
    }

    return {
      error: createGameError(
        ERROR_CODES.UNKNOWN_ERROR,
        error instanceof Error ? error.message : "Unknown error",
        { context, originalError: error }
      ),
    };
  }
};

// React hook for error handling in components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<GameError | null>(null);

  const handleError = React.useCallback((error: unknown, context?: string) => {
    let gameError: GameError;

    if (isFirebaseError(error)) {
      gameError = parseFirebaseError(error);
    } else if (isNetworkError(error)) {
      gameError = createGameError(ERROR_CODES.NETWORK_ERROR);
    } else {
      gameError = createGameError(
        ERROR_CODES.UNKNOWN_ERROR,
        error instanceof Error ? error.message : "Unknown error",
        { context }
      );
    }

    setError(gameError);

    // Log error for debugging
    console.error(`Game Error ${context ? `(${context})` : ""}:`, gameError);

    return gameError;
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

// Error toast notifications interface
export interface ErrorToastProps {
  error: GameError;
  onDismiss: () => void;
}
