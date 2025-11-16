"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Info,
  Plus,
  Minus,
  Trash2,
  Edit2,
  ChevronDown,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

// Player color palette - 10 distinct colors for visual differentiation
const PLAYER_COLORS = [
  { bg: "bg-blue-100", border: "border-blue-500", text: "text-blue-900" },
  {
    bg: "bg-emerald-100",
    border: "border-emerald-500",
    text: "text-emerald-900",
  },
  { bg: "bg-purple-100", border: "border-purple-500", text: "text-purple-900" },
  { bg: "bg-rose-100", border: "border-rose-500", text: "text-rose-900" },
  { bg: "bg-amber-100", border: "border-amber-500", text: "text-amber-900" },
  { bg: "bg-indigo-100", border: "border-indigo-500", text: "text-indigo-900" },
  { bg: "bg-teal-100", border: "border-teal-500", text: "text-teal-900" },
  {
    bg: "bg-fuchsia-100",
    border: "border-fuchsia-500",
    text: "text-fuchsia-900",
  },
  { bg: "bg-orange-100", border: "border-orange-500", text: "text-orange-900" },
  { bg: "bg-cyan-100", border: "border-cyan-500", text: "text-cyan-900" },
];

// Deterministic color assignment based on player ID
const getPlayerColor = (playerId: string, index: number) => {
  // Use index as fallback, hash player ID for consistency
  const hash = playerId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const colorIndex = Math.abs(hash) % PLAYER_COLORS.length;
  return PLAYER_COLORS[colorIndex];
};

export default function BetaLobbyPage() {
  const router = useRouter();
  const {
    gameState,
    sessionId,
    updateGameSettings,
    removePlayerFromRoom,
    changeSetter,
  } = useStore();

  // Extract game state properties
  const roomId = gameState?.roomId ?? null;
  const gamePhase = gameState?.gamePhase ?? "lobby";
  const players = gameState?.players ?? {};
  const currentPlayerId = sessionId;
  const setterUid = gameState?.setterUid ?? "";
  const settings = gameState?.settings ?? {
    connectsRequired: 1,
    playMode: "round_robin" as const,
    majorityThreshold: 1,
    timeLimit: 60,
    maxPlayers: 4,
    wordValidation: "strict" as const,
  };

  const [copied, setCopied] = useState(false);
  const [showConnectsInfo, setShowConnectsInfo] = useState(false);
  const [showSetterDropdown, setShowSetterDropdown] = useState(false);

  // Redirect logic
  useEffect(() => {
    if (!roomId) {
      router.push("/");
      return;
    }
    if (gamePhase !== "lobby") {
      router.push("/beta/play");
    }
  }, [roomId, gamePhase, router]);

  // Generate join URL for QR code with auto-join params
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/beta?join=true&room=${roomId}`
      : "";

  // Copy room code to clipboard
  const handleCopyCode = async () => {
    if (joinUrl) {
      await navigator.clipboard.writeText(joinUrl);
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
  const handlePlayModeToggle = async () => {
    if (!isSetter || !gameState) return;
    const newMode =
      settings.playMode === "round_robin" ? "signull" : "round_robin";
    try {
      await updateGameSettings({
        ...gameState.settings,
        playMode: newMode,
      });
    } catch (err) {
      console.error("Failed to update play mode:", err);
    }
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

  // Check if game can start (at least 3 players)
  const canStartGame = playersList.length >= 3;

  if (!roomId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header - Game Lobby Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900">Game Lobby</h1>
          <p className="mt-2 text-slate-600">
            Share the code below to invite your friends
          </p>
        </div>

        {/* Room Code Section with QR Code */}
        <div className="rounded-2xl bg-white p-6 shadow-xl md:p-8">
          <div className="flex flex-col items-center justify-center space-y-4 md:flex-row md:space-x-6 md:space-y-0">
            {/* Room Code Display */}
            <div className="flex flex-col items-center space-y-3">
              <div className="text-center">
                <div className="text-5xl font-bold tracking-wider text-orange-500 md:text-6xl">
                  {roomId}
                </div>
              </div>

              {/* Copy Button */}
              <Button
                onClick={handleCopyCode}
                variant="outline"
                className="w-full max-w-xs border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700"
              >
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Copy Invite Link"}
              </Button>
            </div>

            {/* QR Code */}
            {joinUrl && (
              <div className="rounded-lg border-2 border-slate-200 bg-white p-3">
                <QRCodeSVG value={joinUrl} size={140} level="M" />
              </div>
            )}
          </div>
        </div>

        {/* Game Settings Row */}
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-center gap-6 md:flex-nowrap md:gap-8">
            {/* Connects Required */}
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center justify-center space-x-1">
                <label className="text-center text-sm font-medium text-slate-700">
                  Connects Required
                </label>
                <button
                  type="button"
                  onMouseEnter={() => setShowConnectsInfo(true)}
                  onMouseLeave={() => setShowConnectsInfo(false)}
                  className="relative text-slate-400 hover:text-slate-600"
                >
                  <Info className="h-4 w-4" />
                  {showConnectsInfo && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 p-3 text-xs text-white shadow-lg">
                      Number of connections required before players can make a
                      direct guess
                    </div>
                  )}
                </button>
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => handleConnectsChange(-1)}
                  disabled={!isSetter || settings.connectsRequired <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-lg font-semibold text-slate-900">
                  {settings.connectsRequired}
                </span>
                <button
                  onClick={() => handleConnectsChange(1)}
                  disabled={
                    !isSetter || settings.connectsRequired >= maxConnects
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Signull Mode Toggle */}
            <div className="flex flex-col items-center space-y-2">
              <label className="text-center text-sm font-medium text-slate-700">
                Signull Mode
              </label>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={handlePlayModeToggle}
                  disabled={!isSetter}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    settings.playMode === "signull"
                      ? "bg-indigo-600"
                      : "bg-slate-300"
                  } ${!isSetter ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      settings.playMode === "signull"
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="inline-block w-6 text-xs text-slate-500">
                  {settings.playMode === "signull" ? "On" : "Off"}
                </span>
              </div>
            </div>

            {/* Setter */}
            <div className="relative flex w-full flex-col items-center space-y-2 md:w-auto">
              <div className="flex items-center justify-center space-x-1">
                <label className="text-center text-sm font-medium text-slate-700">
                  Setter
                </label>
                {isSetter && <Edit2 className="h-3 w-3 text-slate-400" />}
              </div>
              <button
                onClick={() => isSetter && setShowSetterDropdown(true)}
                disabled={!isSetter}
                className="flex items-center justify-center space-x-2 rounded-lg px-3 py-1 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="text-base font-bold text-slate-900">
                  {players[setterUid]?.name || "Unknown"}
                </span>
                {isSetter && <ChevronDown className="h-4 w-4 text-slate-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Player Cards List */}
        <div className="space-y-3">
          {playersList.map((player, index) => {
            const color = getPlayerColor(player.id, index);
            const isHost = player.id === setterUid;
            const isCurrentPlayer = player.id === currentPlayerId;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-2xl p-4 shadow-md transition-all ${
                  isCurrentPlayer ? `border-2 ${color.border}` : ""
                } ${color.bg}`}
              >
                {/* Left: Player Name with Avatar */}
                <div className="flex items-center space-x-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${color.bg} font-semibold ${color.text}`}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`font-semibold ${color.text}`}>
                    {player.name}
                    {isHost && " (Host)"}
                  </span>
                </div>

                {/* Right: Role Badge and Remove Button */}
                <div className="flex items-center space-x-2">
                  {/* Remove Button (only visible to host, can't remove self) */}
                  {isSetter && !isCurrentPlayer && (
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                      title="Remove player"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Waiting for player slots */}
          {Array.from({ length: Math.max(0, 4 - playersList.length) }).map(
            (_, index) => (
              <div
                key={`waiting-${index}`}
                className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-slate-400"
              >
                Waiting for player...
              </div>
            )
          )}
        </div>

        {/* Floating Start Game Button (only visible to setter) */}
        {isSetter && (
          <div className="fixed bottom-8 left-1/2 z-10 w-full max-w-md -translate-x-1/2 px-4">
            <Button
              disabled={!canStartGame}
              className={`w-full rounded-full py-6 text-lg font-semibold shadow-2xl transition-all ${
                canStartGame
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "cursor-not-allowed bg-slate-300 text-slate-500"
              }`}
            >
              Start Game
            </Button>
          </div>
        )}

        {/* How to Play Link */}
        <div className="pb-24 text-center">
          <button className="text-sm text-slate-500 hover:text-slate-700 hover:underline">
            How to play?
          </button>
        </div>
      </div>

      {/* Setter Dropdown Modal */}
      {showSetterDropdown && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSetterDropdown(false)}
        >
          <div
            className="mx-4 w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-center text-lg font-bold text-slate-900">
              Select Setter
            </h3>
            <div className="space-y-2">
              {playersList.map((player) => {
                const color = getPlayerColor(
                  player.id,
                  playersList.indexOf(player)
                );
                const isCurrentSetter = player.id === setterUid;

                return (
                  <button
                    key={player.id}
                    onClick={() => handleChangeSetter(player.id)}
                    className={`w-full rounded-lg p-3 text-left transition-colors ${
                      isCurrentSetter
                        ? `${color.bg} ${color.border} border-2`
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${color.bg} text-sm font-semibold ${color.text}`}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`font-semibold ${isCurrentSetter ? color.text : "text-slate-900"}`}
                      >
                        {player.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
