"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LobbyHeader } from "@/components/lobby/LobbyHeader";
import { PlayerList } from "@/components/lobby/PlayerList";
import { RoleSelectionModal } from "@/components/lobby/RoleSelectionModal";
import { ThresholdControl } from "@/components/lobby/ThresholdControl";
import { ConnectsRequiredControl } from "@/components/lobby/ConnectsRequiredControl";
import { PlayModeToggle } from "@/components/lobby/PlayModeToggle";
import { GameControls } from "@/components/lobby/GameControls";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorToast } from "@/components/error-toast";

export default function LobbyRoute() {
  const router = useRouter();
  const {
    gameState,
    sessionId,
    isLoading,
    error,
    leaveRoom,
    updateGameSettings,
    removePlayerFromRoom,
    changePlayerRole,
    startGame,
    setError,
  } = useStore();

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);

  // Redirect based on game state
  useEffect(() => {
    if (!gameState) {
      router.push("/alpha");
    } else if (gameState.gamePhase !== "lobby") {
      // If game has started, redirect to play page
      router.push("/alpha/play");
    }
  }, [gameState, router]);

  // Handle leaving the room
  const handleLeaveRoom = async () => {
    await leaveRoom();
    router.push("/alpha");
  };

  // Handle threshold change (absolute count)
  const handleThresholdChange = async (newRequiredPeople: number) => {
    if (!gameState) return;

    await updateGameSettings({
      ...gameState.settings,
      // store absolute count directly
      majorityThreshold: newRequiredPeople,
    });
  };

  // Handle connects required change
  const handleConnectsRequiredChange = async (newConnectsRequired: number) => {
    if (!gameState) return;

    await updateGameSettings({
      ...gameState.settings,
      connectsRequired: newConnectsRequired,
    });
  };

  // Handle play mode change
  const handlePlayModeChange = async (
    newPlayMode: "round_robin" | "signull"
  ) => {
    if (!gameState) return;

    await updateGameSettings({
      ...gameState.settings,
      playMode: newPlayMode,
    });
  };

  // Handle player removal
  const handleRemovePlayer = async (playerId: string) => {
    if (!gameState || !playerToRemove) return;
    setIsRemovingPlayer(true);
    try {
      await removePlayerFromRoom(playerId);
      setPlayerToRemove(null);
    } finally {
      setIsRemovingPlayer(false);
    }
  };

  // Handle role change
  const handleRoleChange = async (
    playerId: string,
    newRole: "setter" | "guesser"
  ) => {
    if (!gameState) return;

    await changePlayerRole(playerId, newRole);
    setShowRoleModal(false);
  };

  // Handle start game
  const handleStartGame = async () => {
    if (!gameState) return;

    await startGame();
    router.push("/alpha/play");
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (!gameState) {
    return null; // Will redirect via useEffect
  }

  const currentPlayer = gameState.players[sessionId];
  const isRoomCreator = gameState.setterUid === sessionId;
  const canStartGame =
    currentPlayer?.role === "setter" &&
    Object.keys(gameState.players).length >= 3;

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="rounded-2xl bg-white p-6 shadow-xl md:p-8">
        {/* Header with room info and controls */}
        <LobbyHeader roomId={gameState.roomId} onLeaveRoom={handleLeaveRoom} />

        {/* Player List */}
        <PlayerList
          players={gameState.players}
          currentPlayerId={sessionId}
          isRoomCreator={isRoomCreator}
          onRemovePlayer={(playerId, playerName) =>
            setPlayerToRemove({ id: playerId, name: playerName })
          }
          onEditRoles={() => setShowRoleModal(true)}
        />

        {/* Threshold Control (only for setter) */}
        {currentPlayer?.role === "setter" &&
          (() => {
            const totalGuessers = Object.values(gameState.players).filter(
              (player) => player.role === "guesser"
            ).length;

            // Eligible guessers exclude the current clue giver (setter doesn't guess)
            const eligibleGuessers = Math.max(totalGuessers - 1, 1);

            // Majority threshold is stored as absolute count; clamp to eligible range
            const requiredPeople = Math.max(
              1,
              Math.min(
                gameState.settings.majorityThreshold || 1,
                eligibleGuessers
              )
            );

            return (
              <ThresholdControl
                totalGuessers={eligibleGuessers}
                requiredPeople={requiredPeople}
                onChange={handleThresholdChange}
              />
            );
          })()}

        {/* Connects Required Control */}
        {(() => {
          const totalGuessers = Object.values(gameState.players).filter(
            (player) => player.role === "guesser"
          ).length;

          // Maximum connects possible is activeGuessers - 1
          // During gameplay, one guesser is the clue giver, so max is totalGuessers - 1
          const maxConnectsPossible = Math.max(totalGuessers - 1, 1);

          return (
            <ConnectsRequiredControl
              connectsRequired={gameState.settings.connectsRequired || 1}
              maxConnectsPossible={maxConnectsPossible}
              onChange={handleConnectsRequiredChange}
              isWordSetter={currentPlayer?.role === "setter"}
            />
          );
        })()}

        {/* Play Mode Toggle */}
        <PlayModeToggle
          playMode={gameState.settings.playMode || "round_robin"}
          onChange={handlePlayModeChange}
          isWordSetter={currentPlayer?.role === "setter"}
        />

        {/* Game Controls */}
        <GameControls
          onStartGame={handleStartGame}
          canStartGame={canStartGame}
          isRoomCreator={isRoomCreator}
          playerCount={Object.keys(gameState.players).length}
        />

        {/* Role Selection Modal */}
        {showRoleModal && (
          <RoleSelectionModal
            onClose={() => setShowRoleModal(false)}
            players={gameState.players}
            currentSetterId={gameState.setterUid}
            onRoleChange={handleRoleChange}
          />
        )}

        {/* Player Removal Confirmation */}
        {playerToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">
                Remove player
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Remove {playerToRemove.name} from room?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPlayerToRemove(null)}
                  className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                  disabled={isRemovingPlayer}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRemovePlayer(playerToRemove.id)}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  disabled={isRemovingPlayer}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && <ErrorToast error={error} onDismiss={() => setError(null)} />}
      </div>
    </main>
  );
}
