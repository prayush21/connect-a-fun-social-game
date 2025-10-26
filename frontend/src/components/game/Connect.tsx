"use client";

import { useState, memo } from "react";
import { Button } from "../ui/button";
import type { Reference } from "@/lib/types";

interface ConnectProps {
  currentPlayerId: string;
  currentReference: Reference | null;
  onConnect?: (guess: string) => Promise<void>;
  disabled?: boolean;
  hasActiveReference?: boolean;
  className?: string;
}

export const Connect = memo<ConnectProps>(
  ({
    currentPlayerId,
    currentReference,
    onConnect,
    disabled = false,
    hasActiveReference = false,
    className = "",
  }) => {
    const [guess, setGuess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
      if (!guess.trim()) {
        setError("Please enter your guess");
        return;
      }
      if (!onConnect) return;

      setIsSubmitting(true);
      setError("");
      try {
        await onConnect(guess.trim());
        setGuess("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setGuess(value);
      if (error) setError("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    // Don't render if there's no active reference
    if (!hasActiveReference || !currentReference) {
      return null;
    }

    // If guesser has already submitted
    const hasGuesserSubmitted =
      currentPlayerId in (currentReference.guesses || {});

    if (hasGuesserSubmitted) {
      return (
        <div className={`text-center ${className}`}>
          <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4">
            <p className="text-lg font-semibold text-green-800">
              Connect Raised! Let&apos;s see if it sticks.🤞
            </p>
            <p className="mt-2 text-sm text-green-700">
              Your guess: <span className="font-mono font-bold">{currentReference.guesses[currentPlayerId]}</span>
            </p>
            <p className="mt-1 text-xs text-green-600">Waiting for other players...</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`space-y-3 ${className}`}>
        <div>
          <label htmlFor="guess-input" className="sr-only">
            Your guess for the reference word
          </label>
          <input
            id="guess-input"
            type="text"
            value={guess}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your guess for the reference word..."
            className={`
              w-full rounded-lg border-2 px-4
              py-3 text-base transition-colors
              ${
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
              }
              focus:outline-none focus:ring-2
            `}
            disabled={disabled || isSubmitting}
            autoComplete="off"
            maxLength={50}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={disabled || isSubmitting || !guess.trim()}
          className="w-full font-medium text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          size="lg"
        >
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg" aria-hidden="true">🤝</span>
            {isSubmitting ? "Submitting..." : "Connect"}
          </span>
        </Button>

        <div className="text-center text-xs text-slate-500">
          <>
            💡 Guess what word the clue-giver is thinking of
            <br />
            Press Enter to submit quickly
          </>
        </div>
      </div>
    );
  }
);

Connect.displayName = "Connect";
