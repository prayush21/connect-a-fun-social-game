"use client";

import { useState, useRef, useEffect, memo, useCallback } from "react";
import { Button } from "../ui/button";

interface DirectGuessProps {
  directGuessesLeft: number;
  revealedPrefix: string;
  secretWordLength: number;
  onSubmitDirectGuess: (word: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const DirectGuess = memo<DirectGuessProps>(
  ({
    directGuessesLeft,
    revealedPrefix,
    secretWordLength,
    onSubmitDirectGuess,
    disabled = false,
    className = "",
  }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [guessWord, setGuessWord] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCloseModal = useCallback(() => {
      if (isSubmitting) return;
      setIsModalOpen(false);
      setGuessWord("");
      setError("");
    }, [isSubmitting]);

    // Reset guess when modal opens
    useEffect(() => {
      if (isModalOpen) {
        setGuessWord(revealedPrefix);
        setError("");
        // Focus input after modal animation
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }, [isModalOpen, revealedPrefix]);

    // Handle escape key to close modal
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isModalOpen) {
          handleCloseModal();
        }
      };

      if (isModalOpen) {
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
      }
    }, [isModalOpen, handleCloseModal]);

    const handleOpenModal = () => {
      if (disabled || directGuessesLeft <= 0) return;
      setIsModalOpen(true);
    };

    const validateGuess = (word: string) => {
      const trimmed = word.trim().toUpperCase();

      if (trimmed.length !== secretWordLength) {
        return `Word must be exactly ${secretWordLength} letters long`;
      }

      if (!trimmed.startsWith(revealedPrefix.toUpperCase())) {
        return `Word must start with "${revealedPrefix.toUpperCase()}"`;
      }

      if (!/^[A-Z]+$/.test(trimmed)) {
        return "Word can only contain letters";
      }

      return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      const validationError = validateGuess(guessWord);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsSubmitting(true);
      setError("");

      try {
        await onSubmitDirectGuess(guessWord.trim().toUpperCase());
        handleCloseModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit guess");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toUpperCase();

      // Prevent changing the revealed prefix
      if (!value.startsWith(revealedPrefix.toUpperCase())) {
        return;
      }

      // Limit to secret word length
      if (value.length <= secretWordLength) {
        setGuessWord(value);
        setError("");
      }
    };

    const getCounterColor = () => {
      if (directGuessesLeft === 0) return "bg-slate-400 text-slate-600";
      if (directGuessesLeft === 1) return "bg-red-500 text-white";
      if (directGuessesLeft === 2) return "bg-yellow-500 text-white";
      return "bg-green-500 text-white";
    };

    return (
      <>
        {/* Direct Guess Counter Button */}
        <button
          onClick={handleOpenModal}
          disabled={disabled || directGuessesLeft <= 0}
          className={`
          ${className}
          text-md flex h-10 w-10 items-center justify-center
          rounded-full font-bold transition-all duration-200
          sm:h-5 sm:w-5 sm:text-xl md:h-10
          md:w-10 md:text-2xl
          ${getCounterColor()}
          ${
            disabled || directGuessesLeft <= 0
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95"
          }
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        `}
          aria-label={`${directGuessesLeft} direct guesses remaining. Click to make a guess.`}
          title={`${directGuessesLeft} direct guesses left`}
        >
          {directGuessesLeft}
        </button>

        {/* Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="direct-guess-title"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={handleCloseModal}
              aria-hidden="true"
            />

            {/* Modal Content */}
            <div className="modal-enter relative w-full max-w-md transform rounded-xl bg-white shadow-2xl transition-all">
              <div className="p-6">
                <h2
                  id="direct-guess-title"
                  className="mb-2 text-center text-xl font-semibold"
                >
                  Direct Guess
                </h2>

                <p className="mb-6 text-center text-sm text-slate-600">
                  Enter your guess for the secret word
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="guess-input" className="sr-only">
                      Your guess (must start with {revealedPrefix})
                    </label>
                    <input
                      ref={inputRef}
                      id="guess-input"
                      type="text"
                      value={guessWord}
                      onChange={handleInputChange}
                      placeholder={`Enter word starting with "${revealedPrefix}"`}
                      className={`
                      w-full rounded-lg border-2 px-4 py-3 text-center font-mono
                      text-lg uppercase transition-colors
                      ${
                        error
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
                      }
                      focus:outline-none focus:ring-2
                    `}
                      disabled={isSubmitting}
                      maxLength={secretWordLength}
                      autoComplete="off"
                      spellCheck={false}
                    />

                    <div className="mt-2 text-center text-xs text-slate-500">
                      {guessWord.length}/{secretWordLength} letters
                    </div>
                  </div>

                  {error && (
                    <div
                      className="text-center text-sm text-red-600"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        guessWord.length !== secretWordLength ||
                        !!validateGuess(guessWord)
                      }
                      className="flex-1 bg-primary-500 text-white hover:bg-primary-600"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Guess"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

DirectGuess.displayName = "DirectGuess";
