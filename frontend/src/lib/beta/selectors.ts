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
    const flattenedOrder = signullState.order.reduce(
      (acc, val) => acc.concat(val),
      []
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
