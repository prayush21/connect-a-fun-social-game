"use client";

import { useState, useRef, useEffect, memo } from "react";
import { Button } from "../ui/button";

interface ClueInputProps {
  revealedPrefix: string;
  onSubmitClue: (referenceWord: string, clue: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const ClueInput = memo<ClueInputProps>(
  ({ revealedPrefix, onSubmitClue, disabled = false, className = "" }) => {
    const [referenceWord, setReferenceWord] = useState("");
    const [clue, setClue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ word?: string; clue?: string }>({});

    const wordInputRef = useRef<HTMLInputElement>(null);
    const clueInputRef = useRef<HTMLTextAreaElement>(null);

    // Initialize reference word with revealed prefix
    useEffect(() => {
      setReferenceWord(revealedPrefix.toUpperCase());
    }, [revealedPrefix]);

    // Focus word input on mount
    useEffect(() => {
      if (!disabled) {
        setTimeout(() => wordInputRef.current?.focus(), 100);
      }
    }, [disabled]);

    const validateInputs = () => {
      const newErrors: { word?: string; clue?: string } = {};

      // Validate reference word
      const trimmedWord = referenceWord.trim().toUpperCase();
      if (!trimmedWord) {
        newErrors.word = "Reference word is required";
      } else if (trimmedWord.length < 2) {
        newErrors.word = "Reference word must be at least 2 letters long";
      } else if (!trimmedWord.startsWith(revealedPrefix.toUpperCase())) {
        newErrors.word = `Word must start with "${revealedPrefix.toUpperCase()}"`;
      } else if (!/^[A-Z]+$/.test(trimmedWord)) {
        newErrors.word = "Word can only contain letters";
      }

      // Validate clue
      const trimmedClue = clue.trim();
      if (!trimmedClue) {
        newErrors.clue = "Reference clue is required";
      } else if (trimmedClue.length < 1) {
        newErrors.clue = "Clue must be at least 1 character long";
      } else if (trimmedClue.length > 200) {
        newErrors.clue = "Clue must be less than 200 characters";
      }

      return newErrors;
    };

    const handleSubmitLogic = async () => {
      const validationErrors = validateInputs();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        await onSubmitClue(referenceWord.trim().toUpperCase(), clue.trim());
        // Reset form after successful submission
        setReferenceWord(revealedPrefix.toUpperCase());
        setClue("");
      } catch (err) {
        setErrors({
          clue: err instanceof Error ? err.message : "Failed to submit clue",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await handleSubmitLogic();
    };

    const handleWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toUpperCase();

      // Prevent changing the revealed prefix
      if (!value.startsWith(revealedPrefix.toUpperCase())) {
        return;
      }

      setReferenceWord(value);
      if (errors.word) {
        setErrors({ ...errors, word: undefined });
      }
    };

    const handleClueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= 200) {
        setClue(value);
        if (errors.clue) {
          setErrors({ ...errors, clue: undefined });
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Allow form submission with Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSubmitLogic();
      }
    };

    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold text-slate-800">
            Give a Clue
          </h3>
          <p className="text-sm text-slate-600">
            Think of a word with the same prefix and give others a reference to
            guess it
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          onKeyDown={handleKeyDown}
        >
          {/* Reference Word Input */}
          <div>
            <label
              htmlFor="reference-word"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Clue Word
            </label>
            <input
              ref={wordInputRef}
              id="reference-word"
              type="text"
              value={referenceWord}
              onChange={handleWordChange}
              placeholder={`Enter word starting with "${revealedPrefix}"`}
              className={`
              w-full rounded-lg border-2 px-4 py-3 text-center font-mono
              text-lg uppercase transition-colors
              ${
                errors.word
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
              }
              focus:outline-none focus:ring-2
            `}
              disabled={disabled || isSubmitting}
              autoComplete="off"
              spellCheck={false}
            />
            {errors.word && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.word}
              </p>
            )}
          </div>

          {/* Clue Text Area */}
          <div>
            <label
              htmlFor="clue-text"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Give a Reference
            </label>
            <textarea
              ref={clueInputRef}
              id="clue-text"
              value={clue}
              onChange={handleClueChange}
              placeholder="Make sure that the reference doesn't make it easy for the setter to sabotage"
              rows={3}
              className={`
              w-full resize-none rounded-lg border-2 px-4
              py-3 text-base transition-colors
              ${
                errors.clue
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
              }
              focus:outline-none focus:ring-2
            `}
              disabled={disabled || isSubmitting}
              maxLength={200}
            />
            <div className="mt-1 flex items-center justify-between">
              <div>
                {errors.clue && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.clue}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {clue.length}/200 characters
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              disabled ||
              isSubmitting ||
              !referenceWord.trim() ||
              !clue.trim() ||
              Object.keys(validateInputs()).length > 0
            }
            className="w-full bg-primary-500 text-white hover:bg-primary-600"
            size="lg"
          >
            {isSubmitting ? "Submitting..." : "Submit Clue"}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500">
          💡 Tip: Use Ctrl/Cmd + Enter to submit quickly
        </div>
      </div>
    );
  }
);

ClueInput.displayName = "ClueInput";
