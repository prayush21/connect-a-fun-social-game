"use client";

import { useBetaStore } from "@/lib/beta/store";

/**
 * StartingGameCard Component
 *
 * Displays a message for guessers while waiting for the setter to set the secret word
 * Used during the "setting" phase of the game
 */
export function StartingGameCard() {
  const { game: gameState } = useBetaStore();
  const players = gameState?.players || {};
  const setter = Object.values(players).find(
    (player) => player.role === "setter"
  );
  const setterName = setter ? setter.name : "the setter";
  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Title */}
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-black">
        You are guesser
      </h2>

      {/* Horizontal Divider */}
      <div className="mb-4 w-full border-t-2 border-black" />

      {/* Instructions Text */}
      <div className="flex flex-1 items-center justify-center">
        <p className="text-center text-sm leading-relaxed text-neutral-700">
          Waiting for <b>{setterName}</b> to choose a secret word...
        </p>
      </div>

      {/* Down Arrow */}
      {/* <svg
        className="h-8 w-8 text-black"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M19 9l-7 7-7-7"
        />
      </svg> */}
    </div>
  );
}
