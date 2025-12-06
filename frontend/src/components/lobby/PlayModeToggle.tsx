"use client";

import { useState, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import type { PlayMode } from "@/lib/types";

interface PlayModeToggleProps {
  playMode: PlayMode;
  onChange: (newMode: PlayMode) => void;
  isWordSetter: boolean;
}

export function PlayModeToggle({
  playMode,
  onChange,
  isWordSetter,
}: PlayModeToggleProps) {
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowInfoPopover(false);
      }
    };

    if (showInfoPopover) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showInfoPopover]);

  const handleToggle = () => {
    if (!isWordSetter) return; // Only word setter can change this
    const newMode: PlayMode =
      playMode === "round_robin" ? "signull" : "round_robin";
    onChange(newMode);
  };

  const isSignullMode = playMode === "signull";

  return (
    <div className="my-6 w-full rounded-lg bg-slate-50 p-4">
      <div className="flex w-full items-center justify-between">
        {/* Label with info icon */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">
            Signull Mode
          </label>
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowInfoPopover(!showInfoPopover)}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-slate-600 transition-colors hover:bg-slate-400 hover:text-slate-700"
              aria-label="Show play mode information"
            >
              <Info className="h-3 w-3" />
            </button>

            {/* Info Popover */}
            {showInfoPopover && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
                <div className="space-y-3">
                  <div>
                    <h4 className="mb-1 text-xs font-semibold text-slate-700">
                      Round Robin Mode (Default)
                    </h4>
                    <p className="text-xs text-slate-600">
                      Guessers take turns giving clues in a fixed order.
                      Everyone gets a fair chance to participate.
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-semibold text-slate-700">
                      Signull Mode
                    </h4>
                    <p className="text-xs text-slate-600">
                      Any guesser can volunteer to give a clue at any time. More
                      flexible and dynamic gameplay!
                    </p>
                  </div>
                </div>
                <div className="pointer-events-none absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white"></div>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={!isWordSetter}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            isSignullMode ? "bg-blue-600" : "bg-slate-300"
          } ${
            isWordSetter
              ? "cursor-pointer hover:opacity-80"
              : "cursor-not-allowed opacity-50"
          }`}
          role="switch"
          aria-checked={isSignullMode}
          aria-label="Toggle Signull Mode"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              isSignullMode ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Current Mode Indicator */}
      <div className="mt-2 text-xs text-slate-500">
        Current:{" "}
        <span className="font-medium">
          {playMode === "round_robin" ? "Round Robin" : "Signull"}
        </span>
        {!isWordSetter && (
          <span className="ml-2 text-slate-400">
            (Only Word Setter can change)
          </span>
        )}
      </div>
    </div>
  );
}
