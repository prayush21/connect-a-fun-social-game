"use client";

import { useState, memo } from "react";
import { Button } from "../ui/button";
import type { Reference } from "@/lib/types";

interface SabotageProps {
  currentReference: Reference | null;
  onSabotage?: (guess: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const Sabotage = memo<SabotageProps>(
  ({ currentReference, onSabotage, disabled = false, className = "" }) => {
    const [guess, setGuess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (!currentReference) return null;

    // Final round: sabotage disabled with guidance card
    if (currentReference.isClimactic) {
      return (
        <div className={`text-center ${className}`}>
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
            <p className="text-lg font-semibold text-amber-800">🎯 Final Round</p>
            <p className="mt-2 text-sm text-amber-700">
              Sabotage is disabled in the final round. Guessers must directly connect to the secret word!
            </p>
          </div>
        </div>
      );
    }

    // Setter already succeeded
    const hasSetterSucceeded =
      !!currentReference.setterAttempt &&
      currentReference.setterAttempt.toLowerCase() ===
        currentReference.referenceWord.toLowerCase();

    if (hasSetterSucceeded) {
      return (
        <div className={`text-center ${className}`}>
          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
            <p className="text-lg font-semibold text-red-800">💥 Sabotage Successful!</p>
            <p className="mt-2 text-sm text-red-700">
              You correctly guessed the reference word: {" "}
              <span className="font-mono font-bold">{currentReference.setterAttempt}</span>
            </p>
            <p className="mt-1 text-xs text-red-600">Waiting for round to complete...</p>
          </div>
        </div>
      );
    }

    const handleSubmit = async () => {
      if (!guess.trim()) {
        setError("Please enter your guess");
        return;
      }
      if (!onSabotage) return;

      setIsSubmitting(true);
      setError("");
      try {
        await onSabotage(guess.trim());
        setGuess("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to sabotage");
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

    return (
      <div className={`space-y-3 ${className}`}>
        <div>
          <label htmlFor="sabotage-input" className="sr-only">
            Your sabotage guess
          </label>
          <input
            id="sabotage-input"
            type="text"
            value={guess}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your guess to sabotage..."
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
          className="w-full font-medium text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          size="lg"
        >
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg" aria-hidden="true">💥</span>
            {isSubmitting ? "Submitting..." : "Sabotage"}
          </span>
        </Button>

        <div className="text-center text-xs text-slate-500">
          <>
            🎯 Try to guess the reference word to prevent letter reveal
            <br />
            Press Enter to submit quickly
          </>
        </div>
      </div>
    );
  }
);

Sabotage.displayName = "Sabotage";
