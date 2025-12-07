/**
 * Scoring logic for the beta game schema.
 *
 * Scoring Rules:
 *
 * Signull Scenarios:
 * - Player who makes a correct guess to signull gets 5 points
 * - Player who intercepts a signull gets 5 points
 * - Player whose signull gets resolved gets 5 points + 2x the number of correct connects
 * - If the signull word is same as secret word, upon resolving, all guessers get +5 points
 *
 * Direct Guess Scenario:
 * - Player who makes Direct Guess:
 *   +5 points if >=50% of word length left AND correct
 *   -5 points if >=50% of word length left AND wrong
 *
 * Game End Scenario:
 * - If guessers win: all guessers get (remaining letters)x10 + (number of direct guesses left)x10
 * - If setters win: setter gets (remaining letters)x10
 */

import type {
  PlayerId,
  ScoreUpdates,
  FirestoreGameRoom,
  FirestoreSignullEntry,
} from "./types";
import { SCORING } from "./types";

// ==================== Helper Functions ====================

/**
 * Get all guesser player IDs from a game room
 */
export const getGuesserIds = (data: FirestoreGameRoom): PlayerId[] => {
  return Object.keys(data.players).filter(
    (id) => data.players[id].role === "guesser"
  );
};

/**
 * Calculate remaining letters (unrevealed portion of secret word)
 */
export const getRemainingLetters = (data: FirestoreGameRoom): number => {
  const secretWordLength = data.secretWord.length;
  const revealedCount = data.revealedCount ?? 0;
  return Math.max(0, secretWordLength - revealedCount);
};

/**
 * Check if at least 50% of the word length remains unrevealed
 */
export const isHalfWordRemaining = (data: FirestoreGameRoom): boolean => {
  const secretWordLength = data.secretWord.length;
  const revealedCount = data.revealedCount ?? 0;
  const remaining = secretWordLength - revealedCount;
  return remaining >= secretWordLength / 2;
};

// ==================== Scoring Calculation Functions ====================

/**
 * Calculate score updates for a correct guess on a signull.
 * Called when a player (guesser) correctly guesses the signull word.
 *
 * @param playerId - The player who made the correct guess
 * @returns Score updates to apply
 */
export const calculateCorrectSignullGuessScore = (
  playerId: PlayerId
): ScoreUpdates => {
  return {
    [playerId]: SCORING.CORRECT_GUESS_ON_SIGNULL,
  };
};

/**
 * Calculate score updates when setter intercepts a signull.
 * Called when the setter correctly guesses the signull word (blocking it).
 *
 * @param setterId - The setter who intercepted
 * @returns Score updates to apply
 */
export const calculateInterceptScore = (setterId: PlayerId): ScoreUpdates => {
  return {
    [setterId]: SCORING.INTERCEPT_SIGNULL,
  };
};

/**
 * Calculate score updates when a signull is resolved.
 * Called when a signull reaches the required number of correct connects.
 *
 * @param entry - The signull entry that was resolved
 * @param data - The current game room data
 * @returns Score updates to apply
 */
export const calculateSignullResolvedScore = (
  entry: FirestoreSignullEntry,
  data: FirestoreGameRoom
): ScoreUpdates => {
  const updates: ScoreUpdates = {};
  const correctConnects = entry.connects.filter((c) => c.isCorrect);
  const correctConnectCount = correctConnects.length;

  // Award points to the signull creator
  // Base points + 2x correct connects
  const creatorPoints =
    SCORING.SIGNULL_RESOLVED_BASE +
    correctConnectCount * SCORING.SIGNULL_RESOLVED_PER_CONNECT;
  updates[entry.playerId] = (updates[entry.playerId] ?? 0) + creatorPoints;

  // If signull word matches secret word, all guessers get bonus
  if (entry.isFinal) {
    const guesserIds = getGuesserIds(data);
    guesserIds.forEach((gid) => {
      updates[gid] = (updates[gid] ?? 0) + SCORING.SIGNULL_MATCHES_SECRET_BONUS;
    });
  }

  return updates;
};

/**
 * Calculate score updates for a direct guess.
 * Called when a player makes a direct guess at the secret word.
 *
 * @param playerId - The player who made the direct guess
 * @param isCorrect - Whether the guess was correct
 * @param data - The current game room data
 * @returns Score updates to apply
 */
export const calculateDirectGuessScore = (
  playerId: PlayerId,
  isCorrect: boolean,
  data: FirestoreGameRoom
): ScoreUpdates => {
  const updates: ScoreUpdates = {};
  const halfWordRemaining = isHalfWordRemaining(data);

  if (halfWordRemaining) {
    if (isCorrect) {
      updates[playerId] = SCORING.DIRECT_GUESS_CORRECT_BONUS;
    } else {
      updates[playerId] = SCORING.DIRECT_GUESS_WRONG_PENALTY;
    }
  }
  // No points if less than 50% of word remains

  return updates;
};

/**
 * Calculate score updates when the game ends.
 * Called when the game phase transitions to "ended".
 *
 * @param data - The current game room data
 * @param winner - Who won the game
 * @returns Score updates to apply
 */
export const calculateGameEndScore = (
  data: FirestoreGameRoom,
  winner: "guessers" | "setter"
): ScoreUpdates => {
  const updates: ScoreUpdates = {};
  const remainingLetters = getRemainingLetters(data);
  const directGuessesLeft = data.directGuessesLeft ?? 0;

  if (winner === "guessers") {
    // All guessers get (remaining letters)x10 + (direct guesses left)x10
    const guesserIds = getGuesserIds(data);
    const guesserBonus =
      remainingLetters * SCORING.GAME_END_PER_REMAINING_LETTER +
      directGuessesLeft * SCORING.GAME_END_PER_DIRECT_GUESS_LEFT;

    guesserIds.forEach((gid) => {
      updates[gid] = (updates[gid] ?? 0) + guesserBonus;
    });
  } else if (winner === "setter") {
    // Setter gets (remaining letters)x10
    const setterBonus =
      remainingLetters * SCORING.GAME_END_PER_REMAINING_LETTER;
    updates[data.setterId] = (updates[data.setterId] ?? 0) + setterBonus;
  }

  return updates;
};

// ==================== Aggregation Helpers ====================

/**
 * Merge multiple score updates into a single updates object.
 * Useful for combining scores from different events.
 *
 * @param updates - Array of score update objects
 * @returns Combined score updates
 */
export const mergeScoreUpdates = (...updates: ScoreUpdates[]): ScoreUpdates => {
  const merged: ScoreUpdates = {};
  for (const update of updates) {
    for (const [playerId, delta] of Object.entries(update)) {
      merged[playerId] = (merged[playerId] ?? 0) + delta;
    }
  }
  return merged;
};

/**
 * Convert score updates to Firestore field update paths.
 * Used when building the update object for Firestore transactions.
 *
 * @param updates - Score updates to convert
 * @returns Object with Firestore field paths for score updates
 */
export const scoreUpdatesToFirestoreFields = (
  updates: ScoreUpdates
): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  for (const [playerId, delta] of Object.entries(updates)) {
    // Note: For atomic increments, use FieldValue.increment in the actual transaction
    // This helper just provides the path mapping
    fields[`players.${playerId}.score`] = delta;
  }
  return fields;
};
