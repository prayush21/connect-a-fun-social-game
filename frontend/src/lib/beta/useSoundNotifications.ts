/**
 * useSoundNotifications Hook
 *
 * This hook watches for game state changes and plays appropriate sounds.
 * It integrates with the existing notification system and useGameNotifications.
 *
 * Design:
 * - Listens for game state changes (similar to useGameNotifications)
 * - Plays sounds based on event type
 * - Respects user sound preferences
 * - Handles edge cases like initial load
 */

import { useEffect, useRef } from "react";
import { useBetaStore } from "./store";
import {
  useSound,
  useEnableSoundsOnInteraction,
  usePreloadSounds,
} from "./useSound";
import type { GameState, SignullStatus, LastDirectGuess } from "./types";
import type { SoundEvent } from "./sound-types";

interface SignullTracker {
  id: string;
  status: SignullStatus;
  connectCount: number;
}

interface GameStateSnapshot {
  phase: GameState["phase"];
  revealedCount: number;
  signulls: SignullTracker[];
  playerIds: string[];
  winner: GameState["winner"];
  secretWordSet: boolean;
  lastDirectGuess: LastDirectGuess | null;
  directGuessesLeft: number;
}

function createSnapshot(game: GameState | null): GameStateSnapshot | null {
  if (!game) return null;

  const signulls: SignullTracker[] = Object.values(
    game.signullState.itemsById
  ).map((s) => ({
    id: s.id,
    status: s.status,
    connectCount: s.connects.length,
  }));

  return {
    phase: game.phase,
    revealedCount: game.revealedCount,
    signulls,
    playerIds: Object.keys(game.players),
    winner: game.winner,
    secretWordSet: !!game.secretWord,
    lastDirectGuess: game.lastDirectGuess,
    directGuessesLeft: game.directGuessesLeft,
  };
}

// Critical sounds to preload
const CRITICAL_SOUNDS: SoundEvent[] = [
  "game_start",
  "game_end_win",
  "game_end_lose",
  "letter_revealed",
  "signull_received",
  "signull_resolved",
  "signull_intercepted",
  "notification",
];

/**
 * Main hook for playing sounds based on game events
 *
 * Usage:
 * ```tsx
 * function GameContainer() {
 *   useSoundNotifications(); // Enables sound effects for game events
 *   return <Game />;
 * }
 * ```
 */
export function useSoundNotifications() {
  const game = useBetaStore((state) => state.game);
  const userId = useBetaStore((state) => state.userId);
  const { playSound, canPlay } = useSound();

  // Enable sounds on user interaction
  useEnableSoundsOnInteraction();

  // Preload critical sounds
  usePreloadSounds(CRITICAL_SOUNDS);

  // Keep track of previous state to detect changes
  const prevSnapshotRef = useRef<GameStateSnapshot | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!game || !userId) return;

    const currentSnapshot = createSnapshot(game);
    const prevSnapshot = prevSnapshotRef.current;

    // Skip first render to avoid sound flood on page load
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevSnapshotRef.current = currentSnapshot;
      return;
    }

    if (!prevSnapshot || !currentSnapshot) {
      prevSnapshotRef.current = currentSnapshot;
      return;
    }

    // Only play sounds if user can hear them
    if (!canPlay) {
      prevSnapshotRef.current = currentSnapshot;
      return;
    }

    // Detect game phase changes
    if (prevSnapshot.phase !== currentSnapshot.phase) {
      if (
        currentSnapshot.phase === "signulls" &&
        prevSnapshot.phase === "setting"
      ) {
        // Game started
        playSound("game_start");
      } else if (currentSnapshot.phase === "ended") {
        // Game ended
        if (currentSnapshot.winner === "guessers") {
          playSound("game_end_win");
        } else if (currentSnapshot.winner === "setter") {
          playSound("game_end_lose");
        }
      }
    }

    // Detect letter reveals
    if (currentSnapshot.revealedCount > prevSnapshot.revealedCount) {
      playSound("letter_revealed");
    }

    // Detect direct guess usage
    const currentGuess = currentSnapshot.lastDirectGuess;
    const prevGuess = prevSnapshot.lastDirectGuess;
    if (
      currentGuess &&
      (!prevGuess ||
        currentGuess.timestamp.getTime() !== prevGuess.timestamp.getTime())
    ) {
      // Check if guess was correct (game ended with guessers winning)
      if (
        currentSnapshot.phase === "ended" &&
        currentSnapshot.winner === "guessers"
      ) {
        playSound("direct_guess_correct");
      } else if (currentGuess.playerId !== userId) {
        // Wrong guess from another player
        playSound("direct_guess_wrong");
      }
    }

    // Detect new signulls from other players
    const prevSignullIds = new Set(prevSnapshot.signulls.map((s) => s.id));
    const newSignulls = currentSnapshot.signulls.filter(
      (s) => !prevSignullIds.has(s.id)
    );

    for (const newSignull of newSignulls) {
      const entry = game.signullState.itemsById[newSignull.id];
      if (entry) {
        if (entry.playerId === userId) {
          playSound("signull_sent");
        } else {
          playSound("signull_received");
        }
      }
    }

    // Detect signull status changes
    for (const currentSignull of currentSnapshot.signulls) {
      const prevSignull = prevSnapshot.signulls.find(
        (s) => s.id === currentSignull.id
      );
      if (prevSignull && prevSignull.status !== currentSignull.status) {
        switch (currentSignull.status) {
          case "resolved":
            playSound("signull_resolved");
            break;
          case "blocked":
            playSound("signull_intercepted");
            break;
          case "failed":
            playSound("signull_failed");
            break;
        }
      }

      // Detect new connects on signulls
      if (
        prevSignull &&
        currentSignull.connectCount > prevSignull.connectCount
      ) {
        const entry = game.signullState.itemsById[currentSignull.id];
        if (!entry) continue;

        const latestConnect = entry.connects[entry.connects.length - 1];
        if (latestConnect) {
          if (latestConnect.playerId === userId) {
            playSound("connect_sent");
          } else {
            playSound("connect_received");
          }
        }
      }
    }

    // Detect player join/leave
    const prevPlayerSet = new Set(prevSnapshot.playerIds);
    const currentPlayerSet = new Set(currentSnapshot.playerIds);

    // New players
    for (const playerId of currentSnapshot.playerIds) {
      if (!prevPlayerSet.has(playerId) && playerId !== userId) {
        playSound("player_joined");
        break; // Only play once even if multiple players join
      }
    }

    // Left players
    for (const playerId of prevSnapshot.playerIds) {
      if (!currentPlayerSet.has(playerId) && playerId !== userId) {
        playSound("player_left");
        break; // Only play once even if multiple players leave
      }
    }

    // Update ref for next comparison
    prevSnapshotRef.current = currentSnapshot;
  }, [game, userId, playSound, canPlay]);
}

export default useSoundNotifications;
