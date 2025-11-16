"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { nicknameSchema, joinGameSchema } from "@/lib/validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";

type NicknameFormData = z.infer<typeof nicknameSchema>;
type JoinGameFormData = z.infer<typeof joinGameSchema>;

export default function BetaHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    username,
    setUsername,
    generateNewUsername,
    createRoom,
    joinRoom,
    setError,
    sessionId,
    initAuth,
  } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  const [modalNickname, setModalNickname] = useState("");
  const [hasProcessedJoinLink, setHasProcessedJoinLink] = useState(false);

  // Ensure auth is initialized
  useEffect(() => {
    if (!sessionId) {
      initAuth();
    }
  }, [sessionId, initAuth]);

  const nicknameForm = useForm<NicknameFormData>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname: username },
  });

  const joinGameForm = useForm<JoinGameFormData>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: { gameCode: "" },
  });

  // Sync modal nickname with store username when it changes
  useEffect(() => {
    if (showJoinModal) {
      setModalNickname(username);
    }
  }, [username, showJoinModal]);

  // Sync form with store username changes (for dice button functionality)
  useEffect(() => {
    nicknameForm.setValue("nickname", username);
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

    if (!pendingRoomCode) return;

    setIsJoining(true);
    setError(null);

    try {
      // Update username in store first
      setUsername(modalNickname.trim());

      // Join the room
      await joinRoom(pendingRoomCode, modalNickname.trim());

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
    if (!username.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please set a nickname first",
      });
      return;
    }

    setIsJoining(true);
    setError(null);

    // Normalize room code: trim and convert to uppercase
    const normalizedGameCode = data.gameCode.trim().toUpperCase();
    console.log("Joining game with code:", normalizedGameCode);

    try {
      await joinRoom(normalizedGameCode, username);
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
    if (!username.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please set a nickname first",
      });
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createRoom(username);
      router.push("/beta/lobby");
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md space-y-8">
        {/* Beta Badge */}
        <div className="flex justify-center">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            BETA VERSION
          </span>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-5xl font-bold text-slate-900">Signull</h1>
          <p className="text-lg text-slate-600">
            A collaborative word guessing game
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {/* Nickname Section */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="nickname"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Your Nickname
              </label>
              <div className="flex gap-2">
                <input
                  id="nickname"
                  type="text"
                  className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-3 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your nickname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <button
                  type="button"
                  onClick={generateNewUsername}
                  className="rounded-lg bg-slate-100 px-4 py-3 text-xl transition-colors hover:bg-slate-200"
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
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create a New Game"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-slate-500">or</span>
              </div>
            </div>

            <form
              onSubmit={joinGameForm.handleSubmit(onJoinGameSubmit)}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <input
                  {...joinGameForm.register("gameCode")}
                  type="text"
                  placeholder="Enter Game Code"
                  className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-3 uppercase shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={6}
                  onChange={(e) => {
                    // Convert to uppercase as user types
                    e.target.value = e.target.value.toUpperCase();
                    joinGameForm.setValue("gameCode", e.target.value);
                  }}
                />
                <button
                  type="submit"
                  disabled={isJoining}
                  className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-center text-xl font-semibold text-slate-900">
            How to Play?
          </h2>
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
                One of the guesser gives clues by providing a reference word
                sharing prefix with the secret word (no need to be of same
                length!)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                3
              </span>
              <span>
                Other Guessers race against the word setter to figure out the
                reference word based on the clues!
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
                4
              </span>
              <span>
                Guessers win the next letter in secret word if they get their
                reference word matched before the Setter.
              </span>
            </li>
          </ol>
        </div>
      </div>

      {/* Join Game Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            {/* Modal Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Join Game</h2>
              <button
                onClick={handleModalClose}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Room Code Display */}
            <div className="mb-6 rounded-lg bg-indigo-50 p-4 text-center">
              <p className="mb-1 text-sm text-slate-600">Room Code</p>
              <p className="text-2xl font-bold tracking-wider text-indigo-600">
                {pendingRoomCode}
              </p>
            </div>

            {/* Nickname Input */}
            <div className="mb-6">
              <label
                htmlFor="modal-nickname"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Enter your nickname to join
              </label>
              <div className="flex gap-2">
                <input
                  id="modal-nickname"
                  type="text"
                  className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-3 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="rounded-lg bg-slate-100 px-4 py-3 text-xl transition-colors hover:bg-slate-200"
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
                className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleModalJoin}
                disabled={isJoining || !modalNickname.trim()}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition-all hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isJoining ? "Joining..." : "Join Game"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
