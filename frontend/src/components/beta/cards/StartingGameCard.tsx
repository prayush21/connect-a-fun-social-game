"use client";

/**
 * StartingGameCard Component
 *
 * Displays a message for guessers while waiting for the setter to set the secret word
 * Used during the "setting" phase of the game
 */
export function StartingGameCard() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-3xl bg-transparent p-8">
      <p className="text-center text-sm font-normal tracking-wide text-neutral-400">
        Starting game... Waiting for the setter to set the secret word.
      </p>
    </div>
  );
}
