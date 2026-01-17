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
    submitConnect,
    submitDirectGuess,
    volunteerAsClueGiver,
    leaveRoom,
    returnToLobby,
    initializeNotifications,
    removePlayerFromRoom,
    updateGameSettings,
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
      router.push("/alpha");
    } else if (gameState && gameState.gamePhase === "lobby") {
      // If game is back in lobby phase, redirect to lobby page
      router.push("/alpha/lobby");
    }
  }, [roomId, isLoading, gameState, router]);

  // Handle leave room
  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    try {
      await leaveRoom();
      router.push("/alpha");
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
      router.push("/alpha/lobby");
    } catch (err) {
      console.error("Failed to return to lobby:", err);
      setIsLeaving(false);
    }
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
      await submitConnect(guess);
    } catch (err) {
      console.error("Failed to connect:", err);
      throw err;
    }
  };

  const handleSabotage = async (guess: string) => {
    try {
      await submitConnect(guess);
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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-md md:flex-row">
        <div className="flex items-center gap-3">
          <RoomDropdown roomId={roomId || ""} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleReturnToLobby}
            disabled={isLeaving}
          >
            Return to Lobby
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeaveRoom}
            disabled={isLeaving}
          >
            Leave Room
          </Button>
        </div>
      </header>

      {gamePhase === "word_setting" && (
        <WordSetting
          currentPlayer={currentPlayer}
          currentClueGiver={currentClueGiver}
          onSubmitWord={handleWordSetting}
        />
      )}

      {gamePhase === "waiting_for_clue" && (
        <WaitingState
          currentClueGiver={currentClueGiver}
          currentPlayer={currentPlayer}
        />
      )}

      {gamePhase === "clue_input" && (
        <ClueInput
          currentClueGiver={currentClueGiver}
          currentPlayer={currentPlayer}
          onSubmitClue={handleClueSubmission}
          canSubmitReference={canSubmitReference}
        />
      )}

      {gamePhase === "reference_display" && (
        <ViewReference
          currentClueGiver={currentClueGiver}
          currentPlayer={currentPlayer}
          canSubmitDirectGuess={canSubmitDirectGuess}
          onSubmitDirectGuess={handleDirectGuess}
        />
      )}

      {gamePhase === "connect_phase" && (
        <Connect
          currentClueGiver={currentClueGiver}
          currentPlayer={currentPlayer}
          onSubmitConnect={handleConnect}
        />
      )}

      {gamePhase === "sabotage_phase" && (
        <Sabotage
          currentClueGiver={currentClueGiver}
          currentPlayer={currentPlayer}
          onSubmitConnect={handleSabotage}
        />
      )}

      {gamePhase === "waiting_for_connects" && (
        <WaitingForConnects
          currentClueGiver={currentClueGiver}
          currentPlayer={currentPlayer}
        />
      )}

      {gamePhase === "volunteer_phase" && (
        <VolunteerClueGiver
          currentClueGiver={currentClueGiver}
          currentPlayer={currentPlayer}
          canVolunteerAsClueGiver={canVolunteerAsClueGiver}
          onVolunteer={handleVolunteerAsClueGiver}
        />
      )}

      {gamePhase === "letter_reveal" && (
        <LetterReveal
          revealedPrefix={revealedPrefix}
          guessesReceived={guessesReceived}
          majorityNeeded={majorityNeeded}
        />
      )}

      {gamePhase === "history" && (
        <History currentPlayer={currentPlayer} onRemove={handleRemovePlayer} />
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </div>
      )}
    </main>
  );
}
