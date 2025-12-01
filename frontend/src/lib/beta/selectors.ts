import { useBetaStore } from "./store";
import type {
  GameState,
  SignullEntry,
  PlayerId,
  PlayerRole,
  SignullId,
} from "./types";

// Pure helpers -------------------------------------------------

export function getActiveSignull(state: GameState | null): SignullEntry | null {
  if (!state) return null;
  const { signullState, settings } = state;
  if (settings.playMode === "round_robin") {
    const idx = signullState.activeIndex;
    if (idx === null) return null;
    const keys = Object.keys(signullState.order)
      .map(Number)
      .sort((a, b) => a - b);
    const flattenedOrder = keys.reduce(
      (acc, key) => acc.concat(signullState.order[String(key)]),
      [] as SignullId[]
    );
    const id = flattenedOrder[idx];
    return signullState.itemsById[id] || null;
  }
  // In free mode the UI selects; no automatic active
  return null;
}

export function getSignullById(
  state: GameState | null,
  signullId?: SignullId
): SignullEntry | null {
  if (!state || !signullId) return null;
  return state.signullState.itemsById[signullId] || null;
}

export interface SignullHistoryItem {
  playerId: PlayerId;
  playerName: string;
  role: PlayerRole;
  guess: string;
  isCorrect: boolean;
  timestamp: Date;
}

export function buildSignullHistory(
  state: GameState | null,
  signull: SignullEntry | null
): SignullHistoryItem[] {
  if (!state || !signull) return [];
  return [...(signull.connects || [])]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map((c) => {
      const p = state.players[c.playerId];
      return {
        playerId: c.playerId,
        playerName: p?.name || "Unknown",
        role: p?.role || "guesser",
        guess: c.guess,
        isCorrect: c.isCorrect,
        timestamp: c.timestamp,
      };
    });
}

export function getPendingConnects(
  state: GameState | null,
  signull: SignullEntry | null
): PlayerId[] {
  if (!state || !signull) return [];
  const allGuessers = Object.values(state.players)
    .filter((p) => p.role === "guesser" && p.id !== signull.playerId)
    .map((p) => p.id);
  const connected = new Set(signull.connects.map((c) => c.playerId));
  return allGuessers.filter((id) => !connected.has(id));
}

export function getConnectsRemaining(
  state: GameState | null,
  signull: SignullEntry | null
): number | null {
  if (!state || !signull) return null;
  if (signull.status !== "pending") return 0;
  const correct = signull.connects.filter((c) => c.isCorrect).length;
  return Math.max(0, state.settings.connectsRequired - correct);
}

/**
 * Computed metrics for a Signull
 * Progress is calculated from guesser connects only, but all connects are available for history
 */
export interface SignullMetrics {
  signullId: SignullId;
  clueGiverId: PlayerId;
  clueGiverName: string;
  clue: string;
  word: string;
  status: SignullEntry["status"];
  // Progress tracking - guessers only (excludes setter intercepts)
  correctConnectsFromGuessers: number;
  totalConnectsFromGuessers: number;
  connectsRequired: number;
  totalActiveGuessers: number;
  // Status flags
  isComplete: boolean;
  isIntercepted: boolean;
  isInactive: boolean;
  isFailed: boolean;
  isFinal: boolean;
  // For history display - all connects (includes setter intercepts)
  allConnects: Array<{
    playerId: PlayerId;
    playerName: string;
    playerRole: PlayerRole;
    guess: string;
    isCorrect: boolean;
    timestamp: Date;
  }>;
}

export function getSignullMetrics(
  state: GameState | null,
  signullId: SignullId
): SignullMetrics | null {
  if (!state) return null;
  const signull = state.signullState.itemsById[signullId];
  if (!signull) return null;

  const clueGiver = state.players[signull.playerId];

  // Filter connects to only include guessers (exclude setter's intercepts from progress count)
  const guesserConnects = signull.connects.filter((c) => {
    const player = state.players[c.playerId];
    return player?.role === "guesser";
  });

  // Count correct connects from guessers only
  const correctConnectsFromGuessers = guesserConnects.filter(
    (c) => c.isCorrect
  ).length;

  // Total active guessers (excluding the clue giver if they're a guesser)
  const totalActiveGuessers = Object.values(state.players).filter(
    (p) => p.role === "guesser" && p.id !== signull.playerId && p.isOnline
  ).length;

  // Build all connects with player names and roles for history display
  const allConnectsWithNames = signull.connects
    .map((c) => {
      const player = state.players[c.playerId];
      return {
        playerId: c.playerId,
        playerName: player?.name || "Unknown",
        playerRole: player?.role || "guesser",
        guess: c.guess,
        isCorrect: c.isCorrect,
        timestamp: c.timestamp,
      };
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    signullId: signull.id,
    clueGiverId: signull.playerId,
    clueGiverName: clueGiver?.name || "Unknown",
    clue: signull.clue,
    word: signull.word,
    status: signull.status,
    correctConnectsFromGuessers,
    totalConnectsFromGuessers: guesserConnects.length,
    connectsRequired: state.settings.connectsRequired,
    totalActiveGuessers,
    isComplete: signull.status === "resolved",
    isIntercepted: signull.status === "blocked",
    isInactive: signull.status === "inactive",
    isFailed: signull.status === "failed",
    isFinal: signull.isFinal,
    allConnects: allConnectsWithNames,
  };
}

/**
 * Get all signulls with computed metrics
 */
export function getAllSignullMetrics(
  state: GameState | null
): SignullMetrics[] {
  if (!state) return [];
  return Object.keys(state.signullState.itemsById)
    .map((id) => getSignullMetrics(state, id))
    .filter((data): data is SignullMetrics => data !== null);
}

/**
 * Check if a specific player has already connected to a signull
 */
export function hasPlayerConnected(
  state: GameState | null,
  signullId: SignullId,
  playerId: PlayerId
): boolean {
  if (!state) return false;
  const signull = state.signullState.itemsById[signullId];
  if (!signull) return false;
  return signull.connects.some((c) => c.playerId === playerId);
}

// Hooks --------------------------------------------------------

export function useGame() {
  return useBetaStore((s) => s.game);
}

export function useIsSetter() {
  return useBetaStore((s) => s.userId === s.game?.setterId);
}

export function useActiveSignull() {
  return useBetaStore((s) => getActiveSignull(s.game));
}

export function useSignullHistory(signullId?: SignullId) {
  return useBetaStore((s) => {
    const signull = signullId
      ? getSignullById(s.game, signullId)
      : getActiveSignull(s.game);
    return buildSignullHistory(s.game, signull);
  });
}

export function usePendingConnects(signullId?: SignullId) {
  return useBetaStore((s) => {
    const signull = signullId
      ? getSignullById(s.game, signullId)
      : getActiveSignull(s.game);
    return getPendingConnects(s.game, signull);
  });
}

export function useConnectsRemaining(signullId?: SignullId) {
  return useBetaStore((s) => {
    const signull = signullId
      ? getSignullById(s.game, signullId)
      : getActiveSignull(s.game);
    return getConnectsRemaining(s.game, signull);
  });
}

export function useSignullMetrics(signullId: SignullId) {
  return useBetaStore((s) => getSignullMetrics(s.game, signullId));
}

export function useAllSignullMetrics() {
  return useBetaStore((s) => getAllSignullMetrics(s.game));
}

export function useHasPlayerConnected(
  signullId: SignullId,
  playerId: PlayerId
) {
  return useBetaStore((s) => hasPlayerConnected(s.game, signullId, playerId));
}
