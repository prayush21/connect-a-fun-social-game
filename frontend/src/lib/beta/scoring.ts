/**
 * Scoring logic for the beta game schema.
 *
 * Scoring Rules:
 *
 * Signull Scenarios:
 * - Setter who intercepts a signull gets 5 points (immediately)
 * - When a signull resolves:
 *   - Player whose signull gets resolved gets 10 points
 *   - Guessers with correct connect to resolved signull get 5 points each
 * - Lightning Signull (signull word = secret word):
 *   - When resolved:
 *     - Creator of the lightning signull gets +5 points for each remaining letter
 *     - Guessers who correctly connected get +5 points for each remaining letter
 *     - Setter gets +5 points for each revealed letter (till the lightning signull)
 *   - When failed (all eligible guessers attempted but not enough correct connects):
 *     - Creator gets +5 points for each remaining letter
 *     - Guessers with correct connects get +5 points for each remaining letter
 *     - No points for incorrect connects
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
 * @deprecated No longer used - guessers get points only when signull resolves.
 * Kept for backward compatibility or potential future use.
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

  // Award points to the signull creator: +10
  const resolvedPoints = SCORING.SIGNULL_RESOLVED;
  updates[entry.playerId] = resolvedPoints;
  events.push(
    createScoreEvent(entry.playerId, resolvedPoints, "signull_resolved", {
      signullId: entry.id,
      word: entry.word,
    })
  );

  // Award +5 to each guesser with correct connect to resolved signull
  correctConnects.forEach((connect) => {
    // Only award to guessers (not the setter who might have connected)
    const player = data.players[connect.playerId];
    if (player && player.role === "guesser") {
      const connectBonus = SCORING.CONNECT_TO_RESOLVED_SIGNULL;
      updates[connect.playerId] =
        (updates[connect.playerId] ?? 0) + connectBonus;
      events.push(
        createScoreEvent(
          connect.playerId,
          connectBonus,
          "connect_to_resolved_signull",
          {
            signullId: entry.id,
            word: entry.word,
            connectGuess: connect.guess,
          }
        )
      );
    }
  });

  // If signull word matches secret word (Lightning Signull):
  // - Creator of the signull gets +5 for each remaining letter
  // - Guessers who correctly connected get +5 for each remaining letter
  // - Setter gets +5 for each revealed letter
  if (entry.isFinal) {
    const remainingLetters = getRemainingLetters(data);
    const revealedCount = data.revealedCount ?? 0;

    // Lightning signull bonus for remaining letters
    const lightningBonus =
      remainingLetters * SCORING.LIGHTNING_SIGNULL_PER_REMAINING_LETTER;

    // Creator of the lightning signull gets the bonus
    if (lightningBonus > 0) {
      updates[entry.playerId] = (updates[entry.playerId] ?? 0) + lightningBonus;
      events.push(
        createScoreEvent(
          entry.playerId,
          lightningBonus,
          "lightning_signull_bonus",
          {
            signullId: entry.id,
            secretWord: data.secretWord,
            remainingLetters,
          }
        )
      );
    }

    // Guessers with correct connects also get points for remaining letters
    correctConnects.forEach((connect) => {
      const player = data.players[connect.playerId];
      if (player && player.role === "guesser") {
        updates[connect.playerId] =
          (updates[connect.playerId] ?? 0) + lightningBonus;
        events.push(
          createScoreEvent(
            connect.playerId,
            lightningBonus,
            "lightning_signull_bonus",
            {
              signullId: entry.id,
              secretWord: data.secretWord,
              remainingLetters,
              connectGuess: connect.guess,
            }
          )
        );
      }
    });

    // Setter gets points for revealed letters
    const setterBonus = revealedCount * SCORING.SETTER_REVEALED_LETTERS_BONUS;
    if (setterBonus > 0) {
      updates[data.setterId] = (updates[data.setterId] ?? 0) + setterBonus;
      events.push(
        createScoreEvent(
          data.setterId,
          setterBonus,
          "setter_revealed_letters_bonus",
          {
            signullId: entry.id,
            secretWord: data.secretWord,
            revealedCount,
          }
        )
      );
    }
  }

  return { updates, events };
};

/**
 * Calculate score updates when a lightning signull fails.
 * Called when a lightning signull fails to reach the required number of correct connects.
 * Awards bonus points to the creator and guessers who correctly connected.
 *
 * @param entry - The failed lightning signull entry
 * @param data - The current game room data
 * @returns Score result with updates and events
 */
export const calculateFailedLightningSignullScore = (
  entry: FirestoreSignullEntry,
  data: FirestoreGameRoom
): ScoreResult => {
  const updates: ScoreUpdates = {};
  const events: ScoreEvent[] = [];
  const correctConnects = entry.connects.filter((c) => c.isCorrect);

  // Only apply if this is a lightning signull
  if (!entry.isFinal) {
    return { updates, events };
  }

  const remainingLetters = getRemainingLetters(data);
  const lightningBonus =
    remainingLetters * SCORING.LIGHTNING_SIGNULL_PER_REMAINING_LETTER;

  // Creator of the failed lightning signull gets the bonus
  if (lightningBonus > 0) {
    updates[entry.playerId] = lightningBonus;
    events.push(
      createScoreEvent(
        entry.playerId,
        lightningBonus,
        "failed_lightning_signull_bonus",
        {
          signullId: entry.id,
          secretWord: data.secretWord,
          remainingLetters,
        }
      )
    );
  }

  // Guessers with correct connects also get the bonus
  correctConnects.forEach((connect) => {
    const player = data.players[connect.playerId];
    if (player && player.role === "guesser") {
      updates[connect.playerId] =
        (updates[connect.playerId] ?? 0) + lightningBonus;
      events.push(
        createScoreEvent(
          connect.playerId,
          lightningBonus,
          "failed_lightning_signull_bonus",
          {
            signullId: entry.id,
            secretWord: data.secretWord,
            remainingLetters,
            connectGuess: connect.guess,
          }
        )
      );
    }
  });

  return { updates, events };
};

/**
 * Calculate score updates for a direct guess.
 * Note: Direct guess bonuses/penalties have been removed.
 *
 * @param playerId - The player who made the direct guess
 * @param isCorrect - Whether the guess was correct
 * @param data - The current game room data
 * @param guessWord - The word that was guessed
 * @returns Score result with updates and events (always empty)
 */
export const calculateDirectGuessScore = (
  playerId: PlayerId,
  isCorrect: boolean,
  data: FirestoreGameRoom,
  guessWord?: string
): ScoreResult => {
  // No scoring for direct guesses
  return { updates: {}, events: [] };
};

/**
 * Calculate score updates when the game ends.
 * Note: Game end bonuses have been removed.
 *
 * @param data - The current game room data
 * @param winner - Who won the game
 * @returns Score result with updates and events (always empty)
 */
export const calculateGameEndScore = (
  data: FirestoreGameRoom,
  winner: "guessers" | "setter"
): ScoreResult => {
  // No scoring for game end
  return { updates: {}, events: [] };
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
