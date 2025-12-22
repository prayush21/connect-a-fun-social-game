"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Volume2 } from "lucide-react";
import { useBetaStore } from "@/lib/beta/store";
import {
  RoomCodeCard,
  SettingsCard,
  PlayerList,
  StartGameButton,
} from "@/components/beta/lobby";
import { AudioSettingsModal } from "@/components/beta";
import { Checkbox } from "@/components/ui/checkbox";
import { copyToClipboard } from "@/lib/utils";
import { useEnableSoundsOnInteraction } from "@/lib/beta/useSound";
import { useSoundNotifications } from "@/lib/beta/useSoundNotifications";
import { Logo } from "@/components/ui/Logo";

export default function BetaLobbyPage() {
  const router = useRouter();
  const {
    roomId: storeRoomId,
    game: gameState,
    userId: sessionId,
    initialized,
    updateGameSettings,
    removePlayerFromRoom,
    changeSetter,
    startGame,
    resetScores,
    teardown,
    leaveRoom,
    showTutorial,
    setShowTutorial,
  } = useBetaStore();

  // Use store's roomId (set immediately) instead of gameState?.roomId (async from Firebase)
  const roomId = storeRoomId;
  const gamePhase = gameState?.phase ?? "lobby";
  const players = gameState?.players ?? {};
  const currentPlayerId = sessionId || "";
  const setterUid = gameState?.setterId ?? "";
  const hostId = gameState?.hostId ?? "";
  const settings = gameState?.settings ?? {
    connectsRequired: 1,
    playMode: "round_robin" as const,
    majorityThreshold: 1,
    timeLimitSeconds: 60,
    maxPlayers: 4,
    wordValidation: "strict" as const,
    prefixMode: false,
    showScoreBreakdown: true,
  };

  const [copied, setCopied] = useState(false);
  const [showSetterDropdown, setShowSetterDropdown] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  // Enable sounds on user interaction and play sounds for player events
  useEnableSoundsOnInteraction();
  useSoundNotifications();

  // Redirect logic
  useEffect(() => {
    // No room in store - redirect to home
    if (!roomId) {
      router.push("/beta");
      return;
    }

    // Wait for Firebase subscription to initialize before checking player membership
    if (!initialized) {
      return;
    }

    // If game state is loaded but player is not in it, they were removed
    if (gameState && sessionId && !gameState.players[sessionId]) {
      teardown();
      router.push("/beta");
      return;
    }

    if (gamePhase !== "lobby" && showTutorial) {
      router.push("/beta/tour");
      return;
    }

    if (gamePhase !== "lobby") {
      router.push("/beta/play");
    }
  }, [roomId, gamePhase, router, gameState, sessionId, teardown, initialized]);

  // Generate join URL for QR code with auto-join params
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/beta?join=true&room=${roomId}`
      : "";

  // Copy room code to clipboard
  const handleCopyCode = async () => {
    if (!joinUrl) return;

    const success = await copyToClipboard(joinUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get players as array and sort
  const playersList = Object.values(players).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Calculate max connects (total guessers - 1)
  const totalGuessers = playersList.filter((p) => p.role === "guesser").length;
  const maxConnects = Math.max(1, totalGuessers - 1);

  // Check if current player is setter
  const isSetter = currentPlayerId === setterUid;

  // Check if current player is host (host controls settings and can change setter)
  const isHost = currentPlayerId === hostId;

  // Handle connects required change
  const handleConnectsChange = async (delta: number) => {
    if (!isHost || !gameState) return;
    const newValue = Math.max(
      1,
      Math.min(maxConnects, settings.connectsRequired + delta)
    );
    try {
      await updateGameSettings({
        ...gameState.settings,
        connectsRequired: newValue,
      });
    } catch (err) {
      console.error("Failed to update connects required:", err);
    }
  };

  // Handle prefix mode toggle
  const handlePrefixModeToggle = () => {
    if (!isHost) return;
    updateGameSettings({
      prefixMode: !settings.prefixMode,
    });
  };

  // Handle score breakdown toggle
  const handleScoreBreakdownToggle = () => {
    if (!isHost) return;
    updateGameSettings({
      showScoreBreakdown: !settings.showScoreBreakdown,
    });
  };

  // Handle remove player
  const handleRemovePlayer = async (playerId: string) => {
    if (!isHost) return;
    try {
      await removePlayerFromRoom(playerId);
    } catch (err) {
      console.error("Failed to remove player:", err);
    }
  };

  // Handle change setter
  const handleChangeSetter = async (newSetterId: string) => {
    if (!isHost || !gameState) return;

    // Don't do anything if selecting the current setter
    if (newSetterId === setterUid) {
      setShowSetterDropdown(false);
      return;
    }

    try {
      await changeSetter(newSetterId);
      setShowSetterDropdown(false);
    } catch (err) {
      console.error("Failed to change setter:", err);
    }
  };

  // Handle reset scores
  const handleResetScores = async () => {
    if (!isHost) return;
    try {
      await resetScores();
    } catch (err) {
      console.error("Failed to reset scores:", err);
    }
  };

  // Handle start game
  const handleStartGame = async () => {
    if (!gameState) return;

    try {
      await startGame();

      if (showTutorial) {
        router.push("/beta/tour");
      } else {
        router.push("/beta/play");
      }
    } catch (err) {
      console.error("Failed to start game:", err);
    }
  };

  // Handle leave room
  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      router.push("/beta");
    } catch (err) {
      console.error("Failed to leave room:", err);
    }
  };

  // Check if game can start (at least 3 players)
  const canStartGame = playersList.length >= 3;

  if (!roomId) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-surface px-4 py-6 md:px-6">
      <div className="mx-auto w-full max-w-md space-y-6 pb-32">
        <header className="mb-4 flex items-start justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-primary">Game Lobby</h1>
            <p className="text-neutral-500">
              Share the code below to invite your friends
            </p>
          </div>
          <Logo />
        </header>

        <RoomCodeCard
          roomCode={roomId}
          joinUrl={joinUrl}
          onCopy={handleCopyCode}
          copied={copied}
        />

        <div className="relative">
          <SettingsCard
            connectsRequired={settings.connectsRequired}
            onConnectsChange={handleConnectsChange}
            prefixMode={settings.prefixMode}
            onTogglePrefixMode={handlePrefixModeToggle}
            showScoreBreakdown={settings.showScoreBreakdown ?? true}
            onToggleScoreBreakdown={handleScoreBreakdownToggle}
            setterName={players[setterUid]?.name || "Unknown"}
            isSetter={isHost}
            onSetterChange={() => setShowSetterDropdown(!showSetterDropdown)}
            onResetScores={handleResetScores}
          />

          {/* Setter Dropdown */}
          {showSetterDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border-2 border-black bg-white shadow-xl">
              {playersList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleChangeSetter(p.id)}
                  className={`w-full p-4 text-left font-medium transition-colors hover:bg-neutral-100 ${
                    p.id === setterUid ? "bg-neutral-50 text-blue-600" : ""
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <PlayerList
          players={playersList}
          currentUserId={currentPlayerId}
          hostId={hostId}
          setterId={setterUid}
          onRemovePlayer={handleRemovePlayer}
          isHost={isHost}
        />

        {/* How to Play Button & Tutorial Checkbox */}
        <div className="mt-6 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-tutorial"
              checked={showTutorial}
              onChange={(e) => setShowTutorial(e.target.checked)}
            />
            <label
              htmlFor="show-tutorial"
              className="cursor-pointer select-none text-sm text-neutral-600"
            >
              Show interactive tutorial on start
            </label>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="text-sm text-neutral-500 underline transition-colors hover:text-neutral-700"
            >
              How to play?
            </button>
            <span className="text-neutral-300">|</span>
            <button
              onClick={() => setShowAudioSettings(true)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 underline transition-colors hover:text-neutral-700"
            >
              <Volume2 className="h-4 w-4" />
              Audio
            </button>
            <span className="text-neutral-300">|</span>
            <button
              onClick={handleLeaveRoom}
              className="text-sm text-red-500 underline transition-colors hover:text-red-700"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>

      {isHost && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-surface via-surface to-transparent px-4 pb-6 pt-12 md:px-6">
          <div className="mx-auto max-w-md">
            <StartGameButton
              onClick={handleStartGame}
              disabled={!canStartGame}
            />
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                How to Play?
              </h2>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Instructions */}
            <ol className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                  1
                </span>
                <span>
                  One player sets a secret word that others team up to guess
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                  2
                </span>
                <span>
                  Any guesser can now give clues(called Signulls) by providing a
                  reference word sharing prefix with the secret word (no need to
                  be of same length!). Press on the Lightning icon to generate a
                  signull.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                  3
                </span>
                <span>
                  Other Guessers race against the word setter to figure out the
                  reference word based on the clues! Press the Right Arrow icon
                  to submit your match.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                  4
                </span>
                <span>
                  Guessers win the next letter in secret word if they get their
                  reference word matched before the Setter. Press on the Signull
                  card to view who connected and guessed to a Signull
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                  5
                </span>
                <span>
                  At any point a guessers have a total of 3 direct guesses to
                  directly guess the secret word. Use them wisely! Press on top
                  right Arrow icon to make a direct guess.
                </span>
              </li>
            </ol>

            {/* Close Button */}
            <div className="mt-6">
              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={showAudioSettings}
        onClose={() => setShowAudioSettings(false)}
      />
    </div>
  );
}
