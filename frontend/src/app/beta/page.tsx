"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBetaStore } from "@/lib/beta/store";
import { generateRoomCode } from "@/lib/beta/firebase";
import { nicknameSchema, joinGameSchema } from "@/lib/validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import Image from "next/image";
import { DisplayModeModal } from "@/components/beta/DisplayModeModal";
import { useIsMobile } from "@/lib/hooks";
import { Logo } from "@/components/ui/Logo";

type NicknameFormData = z.infer<typeof nicknameSchema>;
type JoinGameFormData = z.infer<typeof joinGameSchema>;

function BetaHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    username,
    setUsername,
    generateNewUsername,
    setError,
    userId: sessionId,
    initAuth,
  } = useBetaStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDisplayModeModal, setShowDisplayModeModal] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const [modalNickname, setModalNickname] = useState("");
  const [hasProcessedJoinLink, setHasProcessedJoinLink] = useState(false);

  const isMobile = useIsMobile();

  // Ensure auth is initialized
  useEffect(() => {
    if (!sessionId) {
      initAuth();
    }
  }, [sessionId, initAuth]);

  const nicknameForm = useForm<NicknameFormData>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname: username || "" },
  });

  const joinGameForm = useForm<JoinGameFormData>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: { gameCode: "" },
  });

  // Sync modal nickname with store username when it changes
  useEffect(() => {
    if (showJoinModal && username) {
      setModalNickname(username);
    }
  }, [username, showJoinModal]);

  // Sync form with store username changes (for dice button functionality)
  useEffect(() => {
    if (username) {
      nicknameForm.setValue("nickname", username);
    }
  }, [username, nicknameForm]);

  // Handle QR code redirect - always show modal for nickname confirmation
  useEffect(() => {
    const shouldJoin = searchParams.get("join") === "true";
    const roomCode = searchParams.get("room");

    // Wait for sessionId to be ready and only process once
    if (!sessionId || hasProcessedJoinLink) return;

    if (shouldJoin && roomCode) {
      const normalizedRoomCode = roomCode.trim().toUpperCase();

      // Always show modal to confirm/enter nickname (prevents duplicate joins)
      setPendingRoomCode(normalizedRoomCode);
      setModalNickname(username || "");
      setShowJoinModal(true);
      setHasProcessedJoinLink(true);
    }
  }, [searchParams, sessionId, hasProcessedJoinLink, username]);

  // Handle join from modal
  const handleModalJoin = async () => {
    if (!modalNickname.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please enter a nickname",
      });
      return;
    }

    if (!pendingRoomCode || !sessionId) return;

    setIsJoining(true);
    setError(null);

    try {
      // Update username in store first
      setUsername(modalNickname.trim());

      // Join the room
      await useBetaStore.getState().initRoom(pendingRoomCode);

      const error = useBetaStore.getState().error;
      if (error) {
        throw new Error(error.message);
      }

      // Close modal and clear state
      setShowJoinModal(false);
      setPendingRoomCode(null);

      // Clear URL params before navigating
      router.replace("/beta/lobby");
    } catch (err) {
      console.error("Failed to join game:", err);
      setError({
        code: "JOIN_FAILED",
        message: err instanceof Error ? err.message : "Failed to join game",
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowJoinModal(false);
    setPendingRoomCode(null);
    setModalNickname("");
    // Clear URL params
    router.replace("/beta");
  };

  const onJoinGameSubmit = async (data: JoinGameFormData) => {
    if (!username?.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please set a nickname first",
      });
      return;
    }

    if (!sessionId) return;

    setIsJoining(true);
    setError(null);

    // Normalize room code: trim and convert to uppercase
    const normalizedGameCode = data.gameCode.trim().toUpperCase();
    console.log("Joining game with code:", normalizedGameCode);

    try {
      await useBetaStore.getState().initRoom(normalizedGameCode);

      const error = useBetaStore.getState().error;
      if (error) {
        throw new Error(error.message);
      }

      router.push("/beta/lobby");
    } catch (err) {
      console.error("Failed to join game:", err);
      setError({
        code: "JOIN_FAILED",
        message: err instanceof Error ? err.message : "Failed to join game",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateNewGame = async () => {
    if (!username?.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please set a nickname first",
      });
      return;
    }

    if (!sessionId) return;

    // On non-mobile devices (iPad+), show the display mode modal
    if (!isMobile) {
      setShowDisplayModeModal(true);
      return;
    }

    // On mobile, create game directly without display mode
    await createGame(false);
  };

  const createGame = async (isDisplayMode: boolean) => {
    setIsCreating(true);
    setError(null);

    try {
      const roomCode = generateRoomCode();
      await useBetaStore
        .getState()
        .initRoom(roomCode, { createIfMissing: true, isDisplayMode });

      const error = useBetaStore.getState().error;
      if (error) {
        throw new Error(error.message);
      }

      setShowDisplayModeModal(false);

      // Navigate to appropriate page based on mode
      if (isDisplayMode) {
        router.push("/beta/display");
      } else {
        router.push("/beta/lobby");
      }
    } catch (err) {
      console.error("Failed to create game:", err);
      setError({
        code: "CREATE_FAILED",
        message: err instanceof Error ? err.message : "Failed to create game",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDisplayModeSelect = async (useDisplay: boolean) => {
    await createGame(useDisplay);
  };

  return (
    <main className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-md space-y-8">
        {/* Beta Badge */}
        <div className="flex justify-center">
          <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-semibold text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            BETA VERSION
          </span>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1
            // style={{ fontFamily: "var(--font-bangers), cursive !important" }}
            className="flex items-center justify-center text-5xl font-bold text-primary"
          >
            Connect
            <Image
              src="/lightning.svg"
              alt="Lightning"
              width={40}
              height={35}
              className="inline-block"
            />
            Signull
          </h1>
          <p className="text-lg text-neutral-500">
            A collaborative word guessing game
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {/* Nickname Section */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="nickname"
                className="mb-2 block text-sm font-medium text-neutral-600"
              >
                Your Nickname
              </label>
              <div className="flex gap-2">
                <input
                  id="nickname"
                  type="text"
                  className="flex-1 rounded-lg border-2 border-black px-4 py-3 shadow-sm transition-all focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                  placeholder="Enter your nickname"
                  value={username || ""}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <button
                  type="button"
                  onClick={generateNewUsername}
                  className="rounded-lg border-2 border-black bg-white px-4 py-3 text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                >
                  🎲
                </button>
              </div>
              {nicknameForm.formState.errors.nickname && (
                <p className="mt-1 text-sm text-red-600">
                  {nicknameForm.formState.errors.nickname.message}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-4">
            <button
              onClick={handleCreateNewGame}
              disabled={isCreating}
              className="w-full rounded-lg border-2 border-black bg-primary px-4 py-3 font-semibold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create a New Game"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-neutral-500">or</span>
              </div>
            </div>

            <form
              onSubmit={joinGameForm.handleSubmit(onJoinGameSubmit)}
              className="space-y-3"
            >
              <div className="flex flex-row items-center gap-2">
                <div className="flex-1">
                  <input
                    {...joinGameForm.register("gameCode")}
                    type="text"
                    placeholder="Enter Game Code"
                    className="w-full rounded-lg border-2 border-black px-4 py-3 uppercase shadow-sm transition-all focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                    maxLength={6}
                    onChange={(e) => {
                      // Convert to uppercase as user types
                      e.target.value = e.target.value.toUpperCase();
                      joinGameForm.setValue("gameCode", e.target.value);
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="ml-2 rounded-lg border-2 border-black bg-primary px-6 py-3 font-semibold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ minWidth: "80px" }}
                >
                  {isJoining ? "..." : "Join"}
                </button>
              </div>
              {joinGameForm.formState.errors.gameCode && (
                <p className="text-sm text-red-600">
                  {joinGameForm.formState.errors.gameCode.message}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* How to Play Section */}
        <div className="space-y-4 rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-center text-xl font-semibold text-primary">
            How to Play?
          </h2>
          {/* Instructions */}
          <ol className="space-y-4 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                1
              </span>
              <span>
                The setter sets a secret word that other guessers team up to
                guess
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                2
              </span>
              <span>
                To reveal letters in the secret word, guessers give clues called
                Signulls. A Signull is a clue to a reference word sharing a
                prefix with the secret word. (no need to be of same length as
                secret word!)
                <br />
                {/* Any guesser can now give clues(called Signulls) by providing a
                  reference word sharing prefix with the secret word (no need to
                  be of same length!). Press on the Lightning icon to generate a
                  signull. */}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                3
              </span>
              <span>
                Other Guessers race against the setter to figure out the
                reference word based on the clues and connect! Guessers can
                connect only ONCE. Each correct connect to a resolved signull
                gets player points.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                4
              </span>
              <span>
                If the setter intercepts a signull before guessers, no letters
                are revealed. The setter earns points for each intercepted
                signull.
              </span>
            </li>
          </ol>
        </div>
      </div>

      {/* Join Game Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary">Join Game</h2>
              <button
                onClick={handleModalClose}
                className="rounded-lg border-2 border-black p-1 text-neutral-600 transition-all hover:bg-neutral-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Room Code Display */}
            <div className="mb-6 rounded-lg border-2 border-black bg-neutral-50 p-4 text-center">
              <p className="mb-1 text-sm text-neutral-600">Room Code</p>
              <p className="text-2xl font-bold tracking-wider text-primary">
                {pendingRoomCode}
              </p>
            </div>

            {/* Nickname Input */}
            <div className="mb-6">
              <label
                htmlFor="modal-nickname"
                className="mb-2 block text-sm font-medium text-neutral-600"
              >
                Enter your nickname to join
              </label>
              <div className="flex gap-2">
                <input
                  id="modal-nickname"
                  type="text"
                  className="flex-1 rounded-lg border-2 border-black px-4 py-3 shadow-sm transition-all focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                  placeholder="Your nickname"
                  value={modalNickname}
                  onChange={(e) => setModalNickname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isJoining) {
                      handleModalJoin();
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={generateNewUsername}
                  className="rounded-lg border-2 border-black bg-white px-4 py-3 text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                >
                  🎲
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleModalClose}
                disabled={isJoining}
                className="flex-1 rounded-lg border-2 border-black bg-white px-4 py-3 font-semibold text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleModalJoin}
                disabled={isJoining || !modalNickname.trim()}
                className="flex-1 rounded-lg border-2 border-black bg-primary px-4 py-3 font-semibold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isJoining ? "Joining..." : "Join Game"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display Mode Modal */}
      <DisplayModeModal
        isOpen={showDisplayModeModal}
        onClose={() => setShowDisplayModeModal(false)}
        onSelectDisplayMode={handleDisplayModeSelect}
        isLoading={isCreating}
      />
    </main>
  );
}

export default function BetaHome() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <BetaHomeContent />
    </Suspense>
  );
}
