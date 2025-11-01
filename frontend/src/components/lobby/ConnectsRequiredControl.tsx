"use client";

import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";

/**
 * ConnectsRequiredControl Component
 *
 * Controls the number of connections required for game progression.
 *
 * Real-time sync behavior:
 * - When word setter clicks +/-, onChange() is called
 * - onChange() triggers updateGameSettings() in the parent (lobby/page.tsx)
 * - updateGameSettings() updates Firestore via Firebase
 * - subscribeToGameRoom() listener in store.ts receives the update
 * - All connected clients (word setter + view-only players) receive the new state
 * - Component re-renders with updated connectsRequired prop
 * - View-only players see the change instantly without page refresh
 */
interface ConnectsRequiredControlProps {
  connectsRequired: number;
  maxConnectsPossible: number; // Maximum allowed value (typically totalGuessers - 1)
  onChange: (newConnectsRequired: number) => void;
  isWordSetter: boolean;
}

export function ConnectsRequiredControl({
  connectsRequired,
  maxConnectsPossible,
  onChange,
  isWordSetter,
}: ConnectsRequiredControlProps) {
  // No local state needed - we use the prop directly for the "source of truth"
  // The parent handles optimistic updates via the store

  const handleIncrement = () => {
    // Limit to maxConnectsPossible (activeGuessers - 1)
    const newValue = Math.min(connectsRequired + 1, maxConnectsPossible);

    // Only trigger update if value actually changes
    if (newValue !== connectsRequired) {
      // onChange handles:
      // 1. Optimistic local update (immediate UI feedback)
      // 2. Firebase write (syncs to all clients)
      // 3. Automatic rollback on error
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    // Minimum value is 1
    const newValue = Math.max(connectsRequired - 1, 1);

    // Only trigger update if value actually changes
    if (newValue !== connectsRequired) {
      // onChange handles:
      // 1. Optimistic local update (immediate UI feedback)
      // 2. Firebase write (syncs to all clients)
      // 3. Automatic rollback on error
      onChange(newValue);
    }
  };

  // View-only mode for non-word setters
  if (!isWordSetter) {
    return (
      <div className="my-6 w-full rounded-lg bg-slate-50 p-4">
        <div className="flex w-full items-center justify-between">
          {/* Label */}
          <label className="text-sm font-medium text-slate-700">
            Connects Required
          </label>

          {/* Current Value Display (read-only) */}
          <div className="flex items-center">
            <span className="text-lg font-semibold text-slate-900">
              {connectsRequired}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Editable mode for word setter
  return (
    <div className="my-6 w-full rounded-lg bg-slate-50 p-4">
      {/* Label and Stepper in same row */}
      <div className="flex w-full items-center justify-between">
        {/* Label */}
        <label className="text-sm font-medium text-slate-700">
          Connects Required
        </label>

        {/* Stepper Controls */}
        <div className="flex items-center gap-3">
          {/* Minus Button */}
          <button
            type="button"
            onClick={handleDecrement}
            disabled={connectsRequired <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-600 transition-all hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-600"
            aria-label="Decrease connects required"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Current Value Display */}
          <div className="flex min-w-[3rem] items-center justify-center">
            <span className="text-lg font-semibold text-slate-900">
              {connectsRequired}
            </span>
          </div>

          {/* Plus Button */}
          <button
            type="button"
            onClick={handleIncrement}
            disabled={connectsRequired >= maxConnectsPossible}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-600 transition-all hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-600"
            aria-label="Increase connects required"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
