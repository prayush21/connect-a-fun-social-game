"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useBetaStore } from "@/lib/beta/store";
import { RoomInfoButton } from "@/components/beta";
import {
  RoomCodeCard,
  SettingsCard,
  PlayerList,
  StartGameButton,
} from "@/components/beta/lobby";

export default function BetaLobbyPage() {
  const router = useRouter();
  const {
    game: gameState,
    userId: sessionId,
    updateGameSettings,
    removePlayerFromRoom,
    changeSetter,
    startGame,
    teardown,
  } = useBetaStore();

  // Extract game state properties
  const roomId = gameState?.roomId ?? null;
  const gamePhase = gameState?.phase ?? "lobby";
  const players = gameState?.players ?? {};
  const currentPlayerId = sessionId || "";
  const setterUid = gameState?.setterId ?? "";
  const settings = gameState?.settings ?? {
    connectsRequired: 1,
    playMode: "round_robin" as const,
    majorityThreshold: 1,
    timeLimitSeconds: 60,
    maxPlayers: 4,
    wordValidation: "strict" as const,
  };

  const [copied, setCopied] = useState(false);
  const [showSetterDropdown, setShowSetterDropdown] = useState(false);

  // Redirect logic
  useEffect(() => {
    if (!roomId) {
      router.push("/");
      return;
    }

    // If game state is loaded but player is not in it, they were removed
    if (gameState && sessionId && !gameState.players[sessionId]) {
      teardown();
      router.push("/beta");
      return;
    }

    if (gamePhase !== "lobby") {
      router.push("/beta/play");
    }
  }, [roomId, gamePhase, router, gameState, sessionId, teardown]);

  // Generate join URL for QR code with auto-join params
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/beta?join=true&room=${roomId}`
      : "";

  // Copy room code to clipboard
  const handleCopyCode = async () => {
    if (!joinUrl) return;

    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard API failed, trying fallback:", err);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = joinUrl;
        // Ensure it's not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
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

  // Handle connects required change
  const handleConnectsChange = async (delta: number) => {
    if (!isSetter || !gameState) return;
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

  // Handle play mode toggle
  const handleModeToggle = () => {
    if (!isSetter) return;
    const newMode =
      settings.playMode === "round_robin" ? "free" : "round_robin";
    updateGameSettings({
      playMode: newMode,
    });
  };

  // Handle remove player
  const handleRemovePlayer = async (playerId: string) => {
    if (!isSetter) return;
    try {
      await removePlayerFromRoom(playerId);
    } catch (err) {
      console.error("Failed to remove player:", err);
    }
  };

  // Handle change setter
  const handleChangeSetter = async (newSetterId: string) => {
    if (!isSetter || !gameState) return;

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

  // Handle start game
  const handleStartGame = async () => {
    if (!gameState) return;

    try {
      await startGame();
      router.push("/beta/play");
    } catch (err) {
      console.error("Failed to start game:", err);
    }
  };

  // Check if game can start (at least 3 players)
  const canStartGame = playersList.length >= 3;

  if (!roomId) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F2F3F5] px-4 py-6 md:px-6">
      <div className="mx-auto w-full max-w-md space-y-6 pb-32">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-3xl font-bold text-[#1a1f2e]">Game Lobby</h1>
          <p className="text-neutral-500">
            Share the code below to invite your friends
          </p>
        </div>

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
            isSignullMode={settings.playMode === "free"}
            onToggleMode={handleModeToggle}
            setterName={players[setterUid]?.name || "Unknown"}
            isSetter={isSetter}
            onSetterChange={() => setShowSetterDropdown(!showSetterDropdown)}
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
          hostId={setterUid}
          setterId={setterUid}
          onRemovePlayer={handleRemovePlayer}
          isHost={isSetter}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#F2F3F5] via-[#F2F3F5] to-transparent px-4 pb-6 pt-12 md:px-6">
        <div className="mx-auto max-w-md">
          <StartGameButton onClick={handleStartGame} disabled={!canStartGame} />
          <div className="mt-4 text-center">
            <button className="text-sm text-neutral-500 underline">
              How to play?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
