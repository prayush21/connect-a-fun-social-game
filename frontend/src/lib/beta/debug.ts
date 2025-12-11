/**
 * Debug utilities for the beta game schema.
 * Used for logging and debugging game state changes.
 */

import type { GameState, SignullStatus } from "./types";

/**
 * Log a formatted scorecard to the console.
 * Shows all players sorted by score in descending order.
 *
 * @param gameState - Current game state
 * @param event - Optional event description (e.g., "Signull Resolved")
 */
export const logScorecard = (gameState: GameState, event?: string) => {
  const players = Object.values(gameState.players);
  const sorted = players.sort((a, b) => b.score - a.score); // Sort by score descending

  const eventLabel = event ? ` (${event})` : "";
  console.group(`📊 Scorecard${eventLabel}`);
  console.table(
    sorted.map((p, idx) => ({
      Rank: idx + 1,
      Player: p.name,
      Role: p.role,
      Score: p.score,
    }))
  );
  console.groupEnd();
};

/**
 * Get a human-readable label for SignullStatus changes.
 */
export const getSignullStatusLabel = (status: SignullStatus): string => {
  switch (status) {
    case "resolved":
      return "Signull Resolved ✅";
    case "failed":
      return "Signull Failed ❌";
    case "blocked":
      return "Signull Intercepted 🛡️";
    case "inactive":
      return "Signull Invalidated ⏸️";
    case "pending":
      return "Signull Pending ⏳";
    default:
      return "Signull Status Changed";
  }
};
