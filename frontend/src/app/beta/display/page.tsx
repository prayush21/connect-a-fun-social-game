"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBetaStore } from "@/lib/beta/store";
import { copyToClipboard } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Users, Settings } from "lucide-react";

import { Logo } from "@/components/ui/Logo";
import { useSound } from "@/lib/beta/useSound";

export default function BetaDisplayPage() {
  const router = useRouter();
  const {
    roomId: storeRoomId,
    game: gameState,
    initialized,
    isDisplayMode,
    teardown,
  } = useBetaStore();

  const { playSound, canPlay, enableSounds, disableAllSounds } = useSound();

  const roomId = storeRoomId;
  const gamePhase = gameState?.phase ?? "lobby";
  const players = gameState?.players ?? {};
  const settings = gameState?.settings;
  const hostId = gameState?.hostId;

  const [copied, setCopied] = useState(false);

  const displaySoundMode = settings?.displaySoundMode ?? false;

  useEffect(() => {
    //log display sound mode when it is toggled
    if (settings?.displaySoundMode !== undefined) {
      if (settings.displaySoundMode) {
        enableSounds();
      } else {
        disableAllSounds();
      }

      playSound("button_click");
    }
    // return () => {
    //   // Cleanup on unmount
    //   teardown();
    // };
  }, [settings?.displaySoundMode]);

  console.log("Can Play Sound:", canPlay);

  // Redirect logic
  useEffect(() => {
    // No room in store - redirect to home
    if (!roomId) {
      router.push("/beta");
      return;
    }

    // If not in display mode, redirect to lobby
    if (initialized && !isDisplayMode) {
      router.push("/beta/lobby");
      return;
    }

    // When game starts, redirect to play display view
    if (initialized && gamePhase !== "lobby") {
      router.push("/beta/display/play");
    }
  }, [roomId, gamePhase, router, initialized, isDisplayMode]);

  // Generate join URL for QR code
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/beta?join=true&room=${roomId}`
      : "";

  // Copy join URL to clipboard
  const handleCopyCode = async () => {
    if (!joinUrl) return;
    const success = await copyToClipboard(joinUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle leave display
  const handleLeave = () => {
    teardown();
    router.push("/beta");
  };

  const playerList = Object.values(players);
  const playerCount = playerList.length;

  // Show loading while initializing
  if (!initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-primary">Game Lobby</h1>
            <p className="text-neutral-500">
              Share the code below to invite your friends
            </p>
          </div>
          {/* Logo */}
          <Logo iconSize={16} />

          {/* <button
            onClick={handleLeave}
            className="rounded-lg border-2 border-black bg-white px-4 py-2 font-semibold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            Exit Display
          </button> */}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left Column - QR Code and Join Info */}
          <div className="rounded-2xl border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-bold text-neutral-700">
                Scan to Join
              </h2>

              {/* QR Code */}
              <div className="mb-6 flex justify-center">
                <div className="rounded-xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {joinUrl && (
                    <QRCodeSVG
                      value={joinUrl}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>
              </div>

              {/* Room Code */}
              <div className="mb-4">
                <div className="text-sm text-neutral-500">Room Code</div>
                <div className="text-4xl font-bold tracking-widest text-primary">
                  {roomId}
                </div>
              </div>

              <p className="mb-6 text-neutral-500">
                Players can enter the room code or join via the link
              </p>

              {/* Copy Link Button */}
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-neutral-100 px-4 py-2 font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Invite Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Players and Settings */}
          <div className="space-y-6">
            {/* Players Card */}
            <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="text-lg font-bold">
                  Players ({playerCount}/{settings?.maxPlayers || 8})
                </h3>
              </div>

              {playerCount === 0 ? (
                <div className="py-8 text-center text-neutral-500">
                  <p className="text-lg">Waiting for players to join...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {playerList.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 rounded-lg border-2 border-black p-3 ${
                        player.id === hostId ? "bg-primary/10" : "bg-neutral-50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-black font-bold ${
                          player.role === "setter"
                            ? "bg-primary text-white"
                            : "bg-white"
                        }`}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">
                          {player.name}
                          {player.id === hostId && (
                            <span className="ml-2 text-xs text-primary">
                              (Host)
                            </span>
                          )}
                        </div>
                        <div className="text-xs capitalize text-neutral-500">
                          {player.role}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{player.score}</div>
                        <div className="text-xs text-neutral-500">pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Card */}
            <div className="rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <h3 className="text-lg font-bold">Game Settings</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* <div className="rounded-lg bg-neutral-200 p-3">
                  <div className="text-neutral-500">Play Mode</div>
                  <div className="font-semibold capitalize">Classic</div>
                </div> */}
                <div className="rounded-lg bg-neutral-200 p-3">
                  <div className="text-neutral-500">Connects Required</div>
                  <div className="font-semibold">
                    {settings?.connectsRequired || 2}
                  </div>
                </div>
                <div className="rounded-lg bg-neutral-200 p-3">
                  <div className="text-neutral-500">Max Players</div>
                  <div className="font-semibold">
                    {settings?.maxPlayers || 8}
                  </div>
                </div>
                <div className="rounded-lg bg-neutral-200 p-3">
                  <div className="text-neutral-500">Prefix Mode</div>
                  <div className="font-semibold">
                    {settings?.prefixMode ? "On" : "Off"}
                  </div>
                </div>
                <div className="rounded-lg bg-neutral-200 p-3">
                  <div className="text-neutral-500">Display Sound</div>
                  <div className="font-semibold">
                    {settings?.displaySoundMode ? "On" : "Off"}
                  </div>
                </div>
              </div>
            </div>

            {/* Waiting Message */}
            <div className="rounded-2xl border-2 border-black bg-primary/10 p-6 text-center">
              <div className="text-lg font-semibold text-primary">
                {playerCount === 0
                  ? "Waiting for players to join..."
                  : playerCount < 2
                    ? "Need at least 2 players to start"
                    : "Waiting for host to start the game..."}
              </div>
              <div className="mt-2 text-sm text-neutral-600">
                The host can start the game and update game settings from their
                device
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
