"use client";

/**
 * WaitingCard Component
 *
 * Displays a dashed border card with "Waiting for a signull..." message
 * Used when the player is waiting for a clue from the clue giver
 */
export function WaitingCard() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-3xl bg-transparent p-8">
      <p className="text-center text-sm font-normal tracking-wide text-neutral-400">
        Waiting for a signull...
      </p>
    </div>
  );
}
