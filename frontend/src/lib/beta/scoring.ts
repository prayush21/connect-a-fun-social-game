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
  ScoreEvent,
  ScoreReason,
  FirestoreGameRoom,
  FirestoreSignullEntry,
  SignullId,
} from "./types";
import { SCORING } from "./types";

// ==================== Score Result Type ====================

/**
 * Result of a score calculation, containing both the updates to apply
 * and the events to record for score breakdown display.
 */
export interface ScoreResult {
  updates: ScoreUpdates;
  events: ScoreEvent[];
}

/**
 * Helper to create a score event
 */
const createScoreEvent = (
  playerId: PlayerId,
  delta: number,
  reason: ScoreReason,
  details?: Record<string, unknown>
): ScoreEvent => ({
  playerId,
  delta,
  reason,
  timestamp: new Date(),
  details,
});

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
 * @param signullId - The signull that was guessed correctly
 * @returns Score result with updates and events
 */
export const calculateCorrectSignullGuessScore = (
  playerId: PlayerId,
  signullId?: SignullId
): ScoreResult => {
  const delta = SCORING.CORRECT_GUESS_ON_SIGNULL;
  return {
    updates: { [playerId]: delta },
    events: [
      createScoreEvent(playerId, delta, "correct_signull_guess", { signullId }),
    ],
  };
};

/**
 * Calculate score updates when setter intercepts a signull.
 * Called when the setter correctly guesses the signull word (blocking it).
 *
 * @param setterId - The setter who intercepted
 * @param signullId - The signull that was intercepted
 * @returns Score result with updates and events
 */
export const calculateInterceptScore = (
  setterId: PlayerId,
  signullId?: SignullId
): ScoreResult => {
  const delta = SCORING.INTERCEPT_SIGNULL;
  return {
    updates: { [setterId]: delta },
    events: [
      createScoreEvent(setterId, delta, "intercept_signull", { signullId }),
    ],
  };
};

/**
 * Calculate score updates when a signull is resolved.
 * Called when a signull reaches the required number of correct connects.
 *
 * @param entry - The signull entry that was resolved
 * @param data - The current game room data
 * @returns Score result with updates and events
 */
export const calculateSignullResolvedScore = (
  entry: FirestoreSignullEntry,
  data: FirestoreGameRoom
): ScoreResult => {
  const updates: ScoreUpdates = {};
  const events: ScoreEvent[] = [];
  const correctConnects = entry.connects.filter((c) => c.isCorrect);
  const correctConnectCount = correctConnects.length;

  // Award points to the signull creator
  // Base points + 2x correct connects
  const basePoints = SCORING.SIGNULL_RESOLVED_BASE;
  const connectsBonus =
    correctConnectCount * SCORING.SIGNULL_RESOLVED_PER_CONNECT;

  updates[entry.playerId] = basePoints + connectsBonus;

  // Create separate events for base and connects bonus
  events.push(
    createScoreEvent(entry.playerId, basePoints, "signull_resolved", {
      signullId: entry.id,
      word: entry.word,
    })
  );

  if (connectsBonus > 0) {
    events.push(
      createScoreEvent(
        entry.playerId,
        connectsBonus,
        "signull_resolved_connects",
        {
          signullId: entry.id,
          correctConnectCount,
        }
      )
    );
  }

  // If signull word matches secret word, all guessers get bonus
  if (entry.isFinal) {
    const guesserIds = getGuesserIds(data);
    guesserIds.forEach((gid) => {
      const bonus = SCORING.SIGNULL_MATCHES_SECRET_BONUS;
      updates[gid] = (updates[gid] ?? 0) + bonus;
      events.push(
        createScoreEvent(gid, bonus, "signull_secret_match_bonus", {
          signullId: entry.id,
          secretWord: data.secretWord,
        })
      );
    });
  }

  return { updates, events };
};

/**
 * Calculate score updates for a direct guess.
 * Called when a player makes a direct guess at the secret word.
 *
 * @param playerId - The player who made the direct guess
 * @param isCorrect - Whether the guess was correct
 * @param data - The current game room data
 * @param guessWord - The word that was guessed
 * @returns Score result with updates and events
 */
export const calculateDirectGuessScore = (
  playerId: PlayerId,
  isCorrect: boolean,
  data: FirestoreGameRoom,
  guessWord?: string
): ScoreResult => {
  const updates: ScoreUpdates = {};
  const events: ScoreEvent[] = [];
  const halfWordRemaining = isHalfWordRemaining(data);

  if (halfWordRemaining) {
    if (isCorrect) {
      const delta = SCORING.DIRECT_GUESS_CORRECT_BONUS;
      updates[playerId] = delta;
      events.push(
        createScoreEvent(playerId, delta, "direct_guess_correct", {
          guessWord,
          remainingLetters: getRemainingLetters(data),
        })
      );
    } else {
      const delta = SCORING.DIRECT_GUESS_WRONG_PENALTY;
      updates[playerId] = delta;
      events.push(
        createScoreEvent(playerId, delta, "direct_guess_wrong", {
          guessWord,
          remainingLetters: getRemainingLetters(data),
        })
      );
    }
  }
  // No points if less than 50% of word remains

  return { updates, events };
};

/**
 * Calculate score updates when the game ends.
 * Called when the game phase transitions to "ended".
 *
 * @param data - The current game room data
 * @param winner - Who won the game
 * @returns Score result with updates and events
 */
export const calculateGameEndScore = (
  data: FirestoreGameRoom,
  winner: "guessers" | "setter"
): ScoreResult => {
  const updates: ScoreUpdates = {};
  const events: ScoreEvent[] = [];
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
      events.push(
        createScoreEvent(gid, guesserBonus, "game_end_guessers_win", {
          remainingLetters,
          directGuessesLeft,
        })
      );
    });
  } else if (winner === "setter") {
    // Setter gets (remaining letters)x10
    const setterBonus =
      remainingLetters * SCORING.GAME_END_PER_REMAINING_LETTER;
    updates[data.setterId] = (updates[data.setterId] ?? 0) + setterBonus;
    events.push(
      createScoreEvent(data.setterId, setterBonus, "game_end_setter_win", {
        remainingLetters,
      })
    );
  }

  return { updates, events };
};

// ==================== Aggregation Helpers ====================

/**
 * Merge multiple score results into a single result.
 * Useful for combining scores from different events.
 *
 * @param results - Array of score result objects
 * @returns Combined score result with merged updates and concatenated events
 */
export const mergeScoreResults = (...results: ScoreResult[]): ScoreResult => {
  const merged: ScoreResult = { updates: {}, events: [] };
  for (const result of results) {
    for (const [playerId, delta] of Object.entries(result.updates)) {
      merged.updates[playerId] = (merged.updates[playerId] ?? 0) + delta;
    }
    merged.events.push(...result.events);
  }
  return merged;
};

/**
 * Merge multiple score updates into a single updates object.
 * Useful for combining scores from different events.
 * @deprecated Use mergeScoreResults instead for full event tracking
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
