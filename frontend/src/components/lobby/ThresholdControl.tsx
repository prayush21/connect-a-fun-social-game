"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Minus, Info } from "lucide-react";

interface ThresholdControlProps {
  totalGuessers: number;
  requiredPeople: number;
  onChange: (newRequiredPeople: number) => void;
}

export function ThresholdControl({
  totalGuessers,
  requiredPeople,
  onChange,
}: ThresholdControlProps) {
  const [localRequiredPeople, setLocalRequiredPeople] =
    useState(requiredPeople);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setLocalRequiredPeople(requiredPeople);
  }, [requiredPeople]);

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

  const handleIncrement = () => {
    const newValue = Math.min(localRequiredPeople + 1, totalGuessers);
    setLocalRequiredPeople(newValue);
    if (newValue !== requiredPeople) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = Math.max(localRequiredPeople - 1, 1);
    setLocalRequiredPeople(newValue);
    if (newValue !== requiredPeople) {
      onChange(newValue);
    }
  };

  // Calculate max value (can't require more people than total guessers)
  // const maxPeople = Math.max(1, totalGuessers);

  return (
    <div className="my-6 w-full rounded-lg bg-slate-50 p-4">
      {/* Label and Stepper in same row */}
      <div className="justify-betwee flex w-full items-center">
        {/* Label with info icon */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">
            Threshold
          </label>
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowInfoPopover(!showInfoPopover)}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-slate-600 transition-colors hover:bg-slate-400 hover:text-slate-700"
              aria-label="Show connection threshold information"
            >
              <Info className="h-3 w-3" />
            </button>

            {/* Info Popover */}
            {showInfoPopover && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Number of guessers needed to agree for a successful
                    reference.
                  </p>
                  <div className="space-y-2 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Recommended for 3-4 players:</span>
                      <span className="font-medium">2-3 people</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Recommended for 5+ players:</span>
                      <span className="font-medium">3-4 people</span>
                    </div>
                  </div>
                </div>
                {/* Arrow pointing down */}
                <div className="absolute left-1/2 top-full -translate-x-1/2">
                  <div className="h-2 w-2 rotate-45 border-b border-r border-slate-200 bg-white"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-3">
          {/* Minus Button */}
          <button
            type="button"
            onClick={handleDecrement}
            disabled={localRequiredPeople <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-600 transition-all hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-600"
            aria-label="Decrease number of connects"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Current Value Display */}
          <div className="flex min-w-[3rem] items-center justify-center">
            <span className="text-lg font-semibold text-slate-900">
              {localRequiredPeople}
            </span>
            <span className="ml-1 text-sm text-slate-500">
              / {totalGuessers}
            </span>
          </div>

          {/* Plus Button */}
          <button
            type="button"
            onClick={handleIncrement}
            disabled={localRequiredPeople >= totalGuessers}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-600 transition-all hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-600"
            aria-label="Increase number of connects"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
