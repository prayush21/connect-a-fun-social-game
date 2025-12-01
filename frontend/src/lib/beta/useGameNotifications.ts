/**
 * useGameNotifications Hook
 *
 * This hook watches for game state changes and triggers appropriate
 * notifications. It compares previous and current state to detect:
 * - New signulls from other players
 * - Signull status changes (resolved, intercepted, failed)
 * - Letter reveals
 * - Game phase changes
 * - Player join/leave events
 */

import { useEffect, useRef } from "react";
import { useBetaStore } from "./store";
import { useNotificationStore } from "./notification-store";
import { NotificationTemplates, createNotification } from "./notifications";
import type { GameState, SignullEntry, SignullStatus } from "./types";

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
}

function createSnapshot(game: GameState | null): GameStateSnapshot | null {
  if (!game) return null;

  const signulls: SignullTracker[] = Object.values(
    game.signullState.itemsById
  ).map((s: SignullEntry) => ({
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
  };
}

export function useGameNotifications() {
  const game = useBetaStore((state) => state.game);
  const userId = useBetaStore((state) => state.userId);
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  // Keep track of previous state to detect changes
  const prevSnapshotRef = useRef<GameStateSnapshot | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!game || !userId) return;

    const currentSnapshot = createSnapshot(game);
    const prevSnapshot = prevSnapshotRef.current;

    // Skip first render to avoid notification flood on page load
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevSnapshotRef.current = currentSnapshot;
      return;
    }

    if (!prevSnapshot || !currentSnapshot) {
      prevSnapshotRef.current = currentSnapshot;
      return;
    }

    // Detect game phase changes
    if (prevSnapshot.phase !== currentSnapshot.phase) {
      if (
        currentSnapshot.phase === "signulls" &&
        prevSnapshot.phase === "setting"
      ) {
        // Game started (secret word was set)
        addNotification(
          createNotification(NotificationTemplates.SECRET_WORD_SET())
        );
      } else if (currentSnapshot.phase === "ended") {
        // Game ended
        if (currentSnapshot.winner === "guessers") {
          addNotification(
            createNotification(NotificationTemplates.GAME_ENDED_GUESSERS_WIN())
          );
        } else if (currentSnapshot.winner === "setter") {
          addNotification(
            createNotification(NotificationTemplates.GAME_ENDED_SETTER_WINS())
          );
        }
      }
    }

    // Detect letter reveals
    if (currentSnapshot.revealedCount > prevSnapshot.revealedCount) {
      const letter = game.secretWord[prevSnapshot.revealedCount] ?? "?";
      addNotification(
        createNotification(
          NotificationTemplates.LETTER_REVEALED(
            letter,
            prevSnapshot.revealedCount
          )
        )
      );
    }

    // Detect new signulls from other players
    const prevSignullIds = new Set(prevSnapshot.signulls.map((s) => s.id));
    const newSignulls = currentSnapshot.signulls.filter(
      (s) => !prevSignullIds.has(s.id)
    );

    for (const newSignull of newSignulls) {
      const entry = game.signullState.itemsById[newSignull.id];
      if (entry && entry.playerId !== userId) {
        const playerName = game.players[entry.playerId]?.name ?? "Someone";
        addNotification(
          createNotification(
            NotificationTemplates.SIGNULL_SENT_OTHER(playerName),
            {
              playerId: entry.playerId,
              playerName,
              signullId: entry.id,
            }
          )
        );
      }
    }

    // Detect signull status changes
    for (const currentSignull of currentSnapshot.signulls) {
      const prevSignull = prevSnapshot.signulls.find(
        (s) => s.id === currentSignull.id
      );
      if (prevSignull && prevSignull.status !== currentSignull.status) {
        const entry = game.signullState.itemsById[currentSignull.id];
        if (!entry) continue;

        const clueGiverName = game.players[entry.playerId]?.name ?? "Unknown";
        const setterId = game.setterId;
        const setterName = game.players[setterId]?.name ?? "Setter";

        switch (currentSignull.status) {
          case "resolved":
            addNotification(
              createNotification(
                NotificationTemplates.SIGNULL_RESOLVED(clueGiverName),
                {
                  signullId: currentSignull.id,
                }
              )
            );
            break;
          case "blocked":
            addNotification(
              createNotification(
                NotificationTemplates.SIGNULL_INTERCEPTED(setterName),
                {
                  signullId: currentSignull.id,
                }
              )
            );
            break;
          case "failed":
            addNotification(
              createNotification(
                NotificationTemplates.SIGNULL_FAILED(clueGiverName),
                {
                  signullId: currentSignull.id,
                }
              )
            );
            break;
        }
      }

      // Detect new connects on signulls (when connect count increases)
      if (
        prevSignull &&
        currentSignull.connectCount > prevSignull.connectCount
      ) {
        const entry = game.signullState.itemsById[currentSignull.id];
        if (!entry) continue;

        // Get the latest connect
        const latestConnect = entry.connects[entry.connects.length - 1];
        if (latestConnect && latestConnect.playerId !== userId) {
          const playerName =
            game.players[latestConnect.playerId]?.name ?? "Someone";
          addNotification(
            createNotification(
              NotificationTemplates.CONNECT_RECEIVED(playerName),
              {
                playerId: latestConnect.playerId,
                signullId: currentSignull.id,
              }
            )
          );
        }
      }
    }

    // Detect player join/leave
    const prevPlayerSet = new Set(prevSnapshot.playerIds);
    const currentPlayerSet = new Set(currentSnapshot.playerIds);

    // New players
    for (const playerId of currentSnapshot.playerIds) {
      if (!prevPlayerSet.has(playerId) && playerId !== userId) {
        const playerName = game.players[playerId]?.name ?? "Someone";
        addNotification(
          createNotification(NotificationTemplates.PLAYER_JOINED(playerName), {
            playerId,
            playerName,
          })
        );
      }
    }

    // Left players
    for (const playerId of prevSnapshot.playerIds) {
      if (!currentPlayerSet.has(playerId) && playerId !== userId) {
        // We don't have the player name anymore since they left
        addNotification(
          createNotification(NotificationTemplates.PLAYER_LEFT("A player"), {
            playerId,
          })
        );
      }
    }

    // Update ref for next comparison
    prevSnapshotRef.current = currentSnapshot;
  }, [game, userId, addNotification]);
}
