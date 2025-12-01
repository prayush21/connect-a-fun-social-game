"use client";

import { CircularProgress } from "../CircularProgress";
import type { SignullMetrics } from "@/lib/beta/selectors";

/**
 * SignullCard Props
 *
 * Now accepts SignullMetrics directly from selectors for cleaner state management
 */
export interface SignullCardProps {
  data: SignullMetrics;
  onClick?: () => void;
}

/**
 * SignullCard Component
 *
 * Displays a clue/signull from another player
 * Features: Username (left), circular progress indicator with ratio (right), centered message
 *
 * Progress is calculated based on correct guesses from guessers only (excludes setter intercepts)
 */
export function SignullCard({ data, onClick }: SignullCardProps) {
  const {
    clueGiverName,
    clue,
    correctConnectsFromGuessers,
    totalConnectsFromGuessers,
    connectsRequired,
    totalActiveGuessers,
    isIntercepted,
    isInactive,
    isFailed,
  } = data;

  return (
    <div
      className={`flex h-full w-full cursor-pointer flex-col gap-4 rounded-3xl bg-white ${isInactive || isFailed ? "opacity-60 grayscale" : ""}`}
      onClick={onClick}
    >
      {/* Header: Username and Progress */}
      <div className="mb-4 flex items-center justify-between">
        {/* Username - Left aligned */}
        <div className="text-sm font-bold uppercase tracking-wider text-black">
          {clueGiverName}
        </div>

        {/* Progress Indicator - Right aligned */}
        <div className="flex items-center gap-2">
          {/* Circular Progress - based on correct connects */}
          <CircularProgress
            connectsReceived={correctConnectsFromGuessers}
            connectsRequired={connectsRequired}
            isIntercepted={isIntercepted}
            isInactive={isInactive}
            isFailed={isFailed}
          />

          {/* Ratio Text - shows total connects received / total active guessers */}
          <span className="text-base font-bold text-black">
            {totalConnectsFromGuessers} / {totalActiveGuessers}
          </span>
        </div>
      </div>

      {/* Message - Center aligned and vertically centered */}
      <div className="flex flex-1 justify-center">
        <p className="text-center text-base leading-relaxed text-black">
          {clue}
        </p>
      </div>
    </div>
  );
}
