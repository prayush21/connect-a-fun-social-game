"use client";

import { memo } from "react";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface WaitingForClueProps {
  clueGiverName: string;
  className?: string;
}

export const WaitingForClue = memo<WaitingForClueProps>(
  ({ clueGiverName, className = "" }) => {
    return (
      <div className={`space-y-4 text-center ${className}`}>
        <LoadingSpinner size="lg" />

        <div className="space-y-2">
          <h3 className="text-lg font-medium text-slate-700">
            Waiting for clue...
          </h3>

          <p className="text-slate-600">
            <span className="font-medium text-indigo-600">{clueGiverName}</span>{" "}
            is giving a clue
          </p>

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

WaitingForClue.displayName = "WaitingForClue";
