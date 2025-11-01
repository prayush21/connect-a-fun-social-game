"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LobbyHeader } from "@/components/lobby/LobbyHeader";
import { PlayerList } from "@/components/lobby/PlayerList";
import { RoleSelectionModal } from "@/components/lobby/RoleSelectionModal";
import { ThresholdControl } from "@/components/lobby/ThresholdControl";
import { ConnectsRequiredControl } from "@/components/lobby/ConnectsRequiredControl";
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

  // Redirect based on game state
  useEffect(() => {
    if (!gameState) {
      router.push("/");
    } else if (gameState.gamePhase !== "lobby") {
      // If game has started, redirect to play page
      router.push("/play");
    }
  }, [gameState, router]);

  // Handle leaving the room
  const handleLeaveRoom = async () => {
    await leaveRoom();
    router.push("/");
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

  // Handle player removal
  const handleRemovePlayer = async (playerId: string) => {
    if (!gameState || !playerToRemove) return;

    await removePlayerFromRoom(playerId);
    setPlayerToRemove(null);
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
    router.push("/play");
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

        {/* Game Controls */}
        <GameControls
          canStartGame={canStartGame}
          isRoomCreator={isRoomCreator}
          playerCount={Object.keys(gameState.players).length}
          onStartGame={handleStartGame}
        />

        {/* Role Selection Modal */}
        {showRoleModal && (
          <RoleSelectionModal
            players={gameState.players}
            currentSetterId={gameState.setterUid}
            onRoleChange={handleRoleChange}
            onClose={() => setShowRoleModal(false)}
          />
        )}

        {/* Remove Player Confirmation Modal */}
        {playerToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
              <h2 className="mb-4 text-2xl font-bold text-slate-900">
                Remove Player
              </h2>
              <p className="mb-6 text-slate-600">
                Are you sure you want to remove{" "}
                <span className="font-semibold">{playerToRemove.name}</span>{" "}
                from the game?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPlayerToRemove(null)}
                  className="flex-1 rounded-lg bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemovePlayer(playerToRemove.id)}
                  className="flex-1 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && <ErrorToast error={error} onDismiss={() => setError(null)} />}
      </div>
    </main>
  );
}
