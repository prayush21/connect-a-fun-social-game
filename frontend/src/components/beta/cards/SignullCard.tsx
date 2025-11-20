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
  onClick?: () => void;
  isIntercepted?: boolean;
  messageHistory?: Array<{
    id: string;
    username: string;
    message: string;
    timestamp?: string;
  }>;
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
  onClick,
  isIntercepted = false,
  messageHistory,
}: SignullCardProps) {
  return (
    <div
      className="flex h-full w-full cursor-pointer flex-col gap-4 rounded-3xl bg-white"
      onClick={onClick}
    >
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
            isIntercepted={isIntercepted}
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
