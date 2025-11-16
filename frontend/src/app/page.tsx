"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { nicknameSchema, joinGameSchema } from "@/lib/validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type NicknameFormData = z.infer<typeof nicknameSchema>;
type JoinGameFormData = z.infer<typeof joinGameSchema>;

export default function Home() {
  const router = useRouter();
  const {
    username,
    setUsername,
    generateNewUsername,
    createRoom,
    joinRoom,
    setError,
  } = useStore();
  const [showJoinForm, setShowJoinForm] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const nicknameForm = useForm<NicknameFormData>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname: username },
  });

  const joinGameForm = useForm<JoinGameFormData>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: { gameCode: "" },
  });

  // Sync form with store username changes (for dice button functionality)
  useEffect(() => {
    nicknameForm.setValue("nickname", username);
  }, [username, nicknameForm]);

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
      router.push("/lobby");
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
      router.push("/lobby");
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
    <main className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto max-w-md space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Connect</h1>
          <p className="text-lg text-gray-600">
            A collaborative word guessing game
          </p>
        </div>

        {/* Nickname Section */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="nickname"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Your Nickname
            </label>
            <div className="flex gap-2">
              <input
                id="nickname"
                type="text"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your nickname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button
                type="button"
                onClick={generateNewUsername}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
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
        <div className="space-y-4">
          <button
            onClick={handleCreateNewGame}
            className="w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create a New Game
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">or</span>
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
                placeholder="Enter Code"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 uppercase shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={6}
                onChange={(e) => {
                  // Convert to uppercase as user types
                  e.target.value = e.target.value.toUpperCase();
                  joinGameForm.setValue("gameCode", e.target.value);
                }}
              />
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Join
              </button>
            </div>
            {joinGameForm.formState.errors.gameCode && (
              <p className="text-sm text-red-600">
                {joinGameForm.formState.errors.gameCode.message}
              </p>
            )}
          </form>
        </div>

        {/* How to Play Section */}
        <div className="space-y-4 border-t border-gray-200 pt-8">
          <h2 className="text-center text-xl font-semibold text-gray-900">
            How to Play?
          </h2>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                1
              </span>
              <span>
                One player sets a secret word that others team up to guess
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                2
              </span>
              <span>
                One of the guesser gives clues by providing a reference word
                sharing prefix with the secret word(no need to be of same
                length!)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                3
              </span>
              <span>
                Other Guessers race againest the word setter to figure out the
                reference word based on the clues!
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
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
    </main>
  );
}
