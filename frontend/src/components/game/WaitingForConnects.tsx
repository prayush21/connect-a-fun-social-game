"use client";

import { memo } from "react";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface WaitingForConnectsProps {
  guessesReceived: number;
  majorityNeeded: number;
  className?: string;
}

export const WaitingForConnects = memo<WaitingForConnectsProps>(
  ({ guessesReceived, majorityNeeded, className = "" }) => {
    const progress = (guessesReceived / majorityNeeded) * 100;

    return (
      <div className={`space-y-4 text-center ${className}`}>
        <LoadingSpinner size="lg" />

        <div className="space-y-3">
          <h3 className="text-lg font-medium text-slate-700">
            Waiting for guessers to connect...
          </h3>

          <div className="space-y-2">
            <p className="text-slate-600">
              <span className="font-medium text-indigo-600">
                {guessesReceived}
              </span>{" "}
              of <span className="font-medium">{majorityNeeded}</span> guesses
              received
            </p>

            {/* Progress Bar */}
            <div className="mx-auto h-2 w-full max-w-xs rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 text-slate-400">
            <span className="animate-pulse">●</span>
            <span className="animation-delay-200 animate-pulse">●</span>
            <span className="animation-delay-400 animate-pulse">●</span>
          </div>
        </div>
      </div>
    );
  }
);

WaitingForConnects.displayName = "WaitingForConnects";
