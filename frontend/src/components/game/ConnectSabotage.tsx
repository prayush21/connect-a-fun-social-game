"use client";

import { useState, memo } from "react";
import { Button } from "../ui/button";
import type { Reference } from "@/lib/types";

interface ConnectSabotageProps {
  playerRole: "setter" | "guesser";
  currentPlayerId: string;
  currentReference: Reference | null;
  onConnect?: (guess: string) => Promise<void>;
  onSabotage?: (guess: string) => Promise<void>;
  disabled?: boolean;
  hasActiveReference?: boolean;
  className?: string;
}

export const ConnectSabotage = memo<ConnectSabotageProps>(
  ({
    playerRole,
    currentPlayerId,
    currentReference,
    onConnect,
    onSabotage,
    disabled = false,
    hasActiveReference = false,
    className = "",
  }) => {
    const [guess, setGuess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (action: "connect" | "sabotage") => {
      if (!guess.trim()) {
        setError("Please enter your guess");
        return;
      }

      setIsSubmitting(true);
      setError("");

      try {
        if (action === "connect" && onConnect) {
          await onConnect(guess.trim());
        } else if (action === "sabotage" && onSabotage) {
          await onSabotage(guess.trim());
        }

        // Clear guess after successful submission
        setGuess("");
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${action}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setGuess(value);
      if (error) {
        setError("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (playerRole === "guesser") {
          handleSubmit("connect");
        } else {
          handleSubmit("sabotage");
        }
      }
    };

    // Don't render if there's no active reference
    if (!hasActiveReference || !currentReference) {
      return null;
    }

    const isGuesser = playerRole === "guesser";
    const isClimactic = currentReference.isClimactic;

    // Check if guesser has already submitted
    const hasGuesserSubmitted =
      isGuesser && currentPlayerId in currentReference.guesses;

    // Check if setter has successfully sabotaged (their guess matches the reference word)
    const hasSetterSucceeded =
      !isGuesser &&
      currentReference.setterAttempt &&
      currentReference.setterAttempt.toLowerCase() ===
        currentReference.referenceWord.toLowerCase();

    // For setter in climactic round, hide the controls
    if (!isGuesser && isClimactic) {
      return (
        <div className={`text-center ${className}`}>
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
            <p className="text-lg font-semibold text-amber-800">
              🎯 Final Round
            </p>
            <p className="mt-2 text-sm text-amber-700">
              Sabotage is disabled in the final round. Guessers must
              directly connect to the secret word!
            </p>
          </div>
        </div>
      );
    }

    // For guessers who have already submitted
    if (hasGuesserSubmitted) {
      return (
        <div className={`text-center ${className}`}>
          <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4">
            <p className="text-lg font-semibold text-green-800">
              Connect Raised! Let's see if it sticks.🤞
            </p>
            <p className="mt-2 text-sm text-green-700">
              Your guess: <span className="font-mono font-bold">{currentReference.guesses[currentPlayerId]}</span>
            </p>
            <p className="mt-1 text-xs text-green-600">
              Waiting for other players...
            </p>
          </div>
        </div>
      );
    }

    // For setter who has successfully sabotaged
    if (hasSetterSucceeded) {
      return (
        <div className={`text-center ${className}`}>
          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
            <p className="text-lg font-semibold text-red-800">
              💥 Sabotage Successful!
            </p>
            <p className="mt-2 text-sm text-red-700">
              You correctly guessed the reference word:{" "}
              <span className="font-mono font-bold">{currentReference.setterAttempt}</span>
            </p>
            <p className="mt-1 text-xs text-red-600">
              Waiting for round to complete...
            </p>
          </div>
        </div>
      );
    }

    const buttonText = isGuesser ? "Connect" : "Sabotage";
    const buttonEmoji = isGuesser ? "🤝" : "💥";
    const placeholderText = isGuesser
      ? "Enter your guess for the reference word..."
      : "Enter your guess to sabotage...";

    const buttonColorClasses = isGuesser
      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
      : "bg-red-600 hover:bg-red-700 focus:ring-red-500";

    return (
      <div className={`space-y-3 ${className}`}>
        {/* Input Field */}
        <div>
          <label htmlFor="guess-input" className="sr-only">
            {isGuesser
              ? "Your guess for the reference word"
              : "Your sabotage guess"}
          </label>
          <input
            id="guess-input"
            type="text"
            value={guess}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
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

        {/* Action Button */}
        <Button
          onClick={() => handleSubmit(isGuesser ? "connect" : "sabotage")}
          disabled={disabled || isSubmitting || !guess.trim()}
          className={`
          w-full font-medium text-white
          ${buttonColorClasses}
          disabled:cursor-not-allowed disabled:opacity-50
        `}
          size="lg"
        >
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg" aria-hidden="true">
              {buttonEmoji}
            </span>
            {isSubmitting ? "Submitting..." : buttonText}
          </span>
        </Button>

        {/* Helper Text */}
        <div className="text-center text-xs text-slate-500">
          {isGuesser ? (
            <>
              💡 Guess what word the clue-giver is thinking of
              <br />
              Press Enter to submit quickly
            </>
          ) : (
            <>
              🎯 Try to guess the reference word to prevent letter reveal
              <br />
              Press Enter to submit quickly
            </>
          )}
        </div>
      </div>
    );
  }
);

ConnectSabotage.displayName = "ConnectSabotage";
