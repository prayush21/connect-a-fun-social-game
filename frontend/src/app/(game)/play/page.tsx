"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, useGameSelectors } from "@/lib/store";
import {
  LetterReveal,
  DirectGuess,
  ViewReference,
  ClueInput,
  Connect,
  Sabotage,
  History,
  VolunteerClueGiver,
  WaitingState,
  WaitingForConnects,
  WordSetting,
} from "@/components/game";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RoomDropdown } from "@/components/ui/RoomDropdown";

export default function PlayRoute() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  // Store selectors
  const {
    gameState,
    roomId,
    isLoading,
    error,
    isConnected,
    sessionId,
    setWord,
    setReference,
    submitSetterGuess,
    submitGuess,
    submitDirectGuess,
    volunteerAsClueGiver,
    leaveRoom,
    returnToLobby,
    initializeNotifications,
    removePlayerFromRoom,
  } = useStore();

  // Derived game state
  const {
    currentPlayer,
    currentClueGiver,
    canSubmitDirectGuess,
    canSubmitReference,
    canVolunteerAsClueGiver,
    revealedPrefix,
    majorityNeeded,
    guessesReceived,
    gamePhase,
  } = useGameSelectors();

  // Initialize notifications on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeNotifications();
      // Remove listeners after first interaction
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);
    document.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [initializeNotifications]);

  // Redirect based on game state
  useEffect(() => {
    if (!roomId && !isLoading) {
      router.push("/");
    } else if (gameState && gameState.gamePhase === "lobby") {
      // If game is back in lobby phase, redirect to lobby page
      router.push("/lobby");
    }
  }, [roomId, isLoading, gameState, router]);

  // Handle leave room
  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    try {
      await leaveRoom();
      router.push("/");
    } catch (err) {
      console.error("Failed to leave room:", err);
      setIsLeaving(false);
    }
  };

  // Handle return to lobby
  const handleReturnToLobby = async () => {
    setIsLeaving(true);
    try {
      await returnToLobby();
      router.push("/lobby");
    } catch (err) {
      console.error("Failed to return to lobby:", err);
      setIsLeaving(false);
    }
  };

  // Handle player removal
  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    try {
      await removePlayerFromRoom(playerId);
      console.log(`Removed player: ${playerName}`);
    } catch (err) {
      console.error("Failed to remove player:", err);
    }
  };

  // Handle direct guess submission
  const handleDirectGuess = async (word: string) => {
    try {
      await submitDirectGuess(word);
    } catch (err) {
      console.error("Failed to submit direct guess:", err);
      throw err;
    }
  };

  // Handle clue submission
  const handleClueSubmission = async (referenceWord: string, clue: string) => {
    try {
      await setReference(referenceWord, clue);
    } catch (err) {
      console.error("Failed to submit clue:", err);
      throw err;
    }
  };

  // Handle connect/sabotage
  const handleConnect = async (guess: string) => {
    try {
      await submitGuess(guess);
    } catch (err) {
      console.error("Failed to connect:", err);
      throw err;
    }
  };

  const handleSabotage = async (guess: string) => {
    try {
      await submitSetterGuess(guess);
    } catch (err) {
      console.error("Failed to sabotage:", err);
      throw err;
    }
  };

  // Handle word setting
  const handleWordSetting = async (word: string) => {
    try {
      await setWord(word);
    } catch (err) {
      console.error("Failed to set word:", err);
      throw err;
    }
  };

  // Handle volunteer as clue giver
  const handleVolunteerAsClueGiver = async () => {
    try {
      await volunteerAsClueGiver();
    } catch (err) {
      console.error("Failed to volunteer as clue giver:", err);
      throw err;
    }
  };

  // Loading state
  if (isLoading || !gameState || !currentPlayer) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <LoadingSpinner size="lg" />
          <p className="text-slate-600">Loading game...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md space-y-4 text-center">
          <div className="text-4xl">❌</div>
          <h2 className="text-xl font-semibold text-red-600">Game Error</h2>
          <p className="text-slate-600">{error.message}</p>
          <Button onClick={handleLeaveRoom} variant="outline">
            Return to Home
          </Button>
        </div>
      </main>
    );
  }

  // Game ended state
  if (gamePhase === "ended") {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md space-y-6 text-center">
          <div className="text-6xl">
            {gameState.winner === "guessers" ? "🎉" : "🎯"}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              {gameState.winner === "guessers"
                ? "Guessers Win!"
                : "Setter Wins!"}
            </h2>
            <p className="text-lg text-slate-600">
              The secret word was:{" "}
              <span className="font-mono font-bold text-indigo-600">
                {gameState.secretWord}
              </span>
            </p>
          </div>
          <Button className="bg-primary-500 text-white hover:bg-primary-600" onClick={handleReturnToLobby} size="lg" disabled={isLeaving}>
            {isLeaving ? "Returning..." : "Return to Lobby"}
          </Button>
        </div>
      </main>
    );
  }

  const isCurrentClueGiver = currentClueGiver?.id === currentPlayer.id;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            {roomId && (
              <RoomDropdown
                roomId={roomId}
                players={gameState.players}
                currentPlayerId={currentPlayer.id}
                onLeaveRoom={handleLeaveRoom}
                isLeaving={isLeaving}
                isRoomCreator={gameState.setterUid === sessionId}
                onRemovePlayer={handleRemovePlayer}
                thresholdMajority={gameState.thresholdMajority}
              />
            )}
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} ${!isConnected ? "status-indicator" : ""}`}
            />
          </div>
          <div className="flex items-center gap-3">
            {gamePhase === "guessing" && canSubmitDirectGuess && (
              <DirectGuess
                directGuessesLeft={gameState.directGuessesLeft}
                revealedPrefix={revealedPrefix}
                secretWordLength={gameState.secretWord.length}
                onSubmitGuess={handleDirectGuess}
                disabled={!isConnected}
              />
            )}
            {canVolunteerAsClueGiver && (
              <VolunteerClueGiver
                onVolunteer={handleVolunteerAsClueGiver}
                disabled={!isConnected}
              />
            )}
            {/* <Button
              onClick={handleLeaveRoom}
              variant="outline"
              size="sm"
              disabled={isLeaving}
            >
              {isLeaving ? "Leaving..." : "Leave Game"}
            </Button> */}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-4">
        {/* Main Game Area */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Main Game Display */}
          <div className="space-y-6 lg:col-span-2">
            {/* Letter Reveal - Always visible during gameplay */}
            {(gamePhase === "guessing" || gamePhase === "setting_word") && (
              <div className="game-card-enter rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <LetterReveal
                  secretWord={gameState.secretWord}
                  revealedCount={gameState.revealedCount}
                  className="mb-4"
                />
              </div>
            )}

            {/* Word Setting Phase */}
            {gamePhase === "setting_word" &&
              currentPlayer.role === "setter" && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <WordSetting
                    onSetWord={handleWordSetting}
                    disabled={!isConnected}
                  />
                </div>
              )}

            {/* Waiting for word setter */}
            {gamePhase === "setting_word" &&
              currentPlayer.role === "guesser" && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <WaitingState
                    playerName={
                      Object.values(gameState.players).find(
                        (p) => p.role === "setter"
                      )?.name || "Word Setter"
                    }
                    mode="word"
                  />
                </div>
              )}

            {/* Guessing Phase Content */}
            {gamePhase === "guessing" && (
              <div className="space-y-6">
                {/* Reference Display */}
                {gameState.currentReference && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <ViewReference
                      reference={gameState.currentReference}
                      revealedPrefix={revealedPrefix}
                    />
                  </div>
                )}

                {/* Clue Input - For current clue giver */}
                {!gameState.currentReference &&
                  isCurrentClueGiver &&
                  canSubmitReference && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <ClueInput
                        revealedPrefix={revealedPrefix}
                        onSubmitClue={handleClueSubmission}
                        disabled={!isConnected}
                      />
                    </div>
                  )}

                {/* Waiting states */}
                {!gameState.currentReference &&
                  !isCurrentClueGiver &&
                  currentClueGiver && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <WaitingState playerName={currentClueGiver.name} />
                    </div>
                  )}

                {/* No clue giver available - show appropriate message */}
                {!gameState.currentReference && !currentClueGiver && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="text-center">
                      <div className="mb-3 text-4xl">⚡</div>
                      {canVolunteerAsClueGiver ? (
                        <>
                          <h3 className="mb-2 text-lg font-semibold">
                            Volunteer as Clue Giver
                          </h3>
                          <p className="text-slate-600">
                            The previous clue giver has left. Click the
                            lightning button above to volunteer as the new clue
                            giver!
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="mb-2 text-lg font-semibold">
                            No Clue Giver Available
                          </h3>
                          <p className="text-slate-600">
                            Waiting for a guesser to volunteer as the clue
                            giver...
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {gameState.currentReference && isCurrentClueGiver && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <WaitingForConnects
                      guessesReceived={guessesReceived}
                      majorityNeeded={majorityNeeded}
                    />
                  </div>
                )}

                {/* Connect or Sabotage - Hide for clue giver while waiting */}
                {gameState.currentReference && !isCurrentClueGiver && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    {currentPlayer.role === "guesser" ? (
                      <Connect
                        currentPlayerId={currentPlayer.id}
                        currentReference={gameState.currentReference}
                        onConnect={handleConnect}
                        disabled={!isConnected}
                        hasActiveReference={!!gameState.currentReference}
                      />
                    ) : (
                      <Sabotage
                        currentReference={gameState.currentReference}
                        onSabotage={handleSabotage}
                        disabled={!isConnected}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - History */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <History
                entries={gameState.gameHistory}
                maxHeight="h-96"
                currentUserId={sessionId}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
