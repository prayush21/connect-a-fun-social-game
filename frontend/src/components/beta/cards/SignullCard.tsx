"use client";

import { CircularProgress } from "../CircularProgress";

/**
 * SignullCard Props
 */
export interface SignullCardProps {
  username: string;
  receivedConnects: number;
  requiredConnects: number;
  totalActiveGuessers?: number;
  message: string;
}

/**
 * SignullCard Component
 *
 * Displays a clue/signull from another player
 * Features: Username (left), circular progress indicator with ratio (right), centered message
 */
export function SignullCard({
  username,
  receivedConnects,
  requiredConnects,
  message,
  totalActiveGuessers,
}: SignullCardProps) {
  return (
    <div className="flex h-full w-full flex-col rounded-3xl bg-white">
      {/* Header: Username and Progress */}
      <div className="mb-4 flex items-center justify-between">
        {/* Username - Left aligned */}
        <div className="text-sm font-bold uppercase tracking-wider text-black">
          {username}
        </div>

        {/* Progress Indicator - Right aligned */}
        <div className="flex items-center gap-2">
          {/* Circular Progress */}
          <CircularProgress
            connectsReceived={receivedConnects}
            connectsRequired={requiredConnects}
          />

          {/* Ratio Text */}
          <span className="text-base font-bold text-black">
            {receivedConnects} / {totalActiveGuessers}
          </span>
        </div>
      </div>

      {/* Message - Center aligned and vertically centered */}
      <div className="flex flex-1 justify-center">
        <p className="text-center text-base leading-relaxed text-black">
          {message}
        </p>
      </div>
    </div>
  );
}
