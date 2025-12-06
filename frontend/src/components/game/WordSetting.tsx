"use client";

import { useState, useRef, useEffect, memo } from "react";
import { Button } from "../ui/button";

interface WordSettingProps {
  onSetWord: (word: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const WordSetting = memo<WordSettingProps>(
  ({ onSetWord, disabled = false, className = "" }) => {
    const [word, setWord] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount
    useEffect(() => {
      if (!disabled) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }, [disabled]);

    const validateWord = (inputWord: string) => {
      const trimmed = inputWord.trim().toUpperCase();

      if (!trimmed) {
        return "Word is required";
      }

      if (trimmed.length < 3) {
        return "Word must be at least 3 letters long";
      }

      if (trimmed.length > 15) {
        return "Word must be less than 15 letters long";
      }

      if (!/^[A-Z]+$/.test(trimmed)) {
        return "Word can only contain letters";
      }

      return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      const validationError = validateWord(word);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsSubmitting(true);
      setError("");

      try {
        await onSetWord(word.trim().toUpperCase());
        setWord("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set word");
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toUpperCase();
      setWord(value);
      if (error) {
        setError("");
      }
    };

    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-slate-800">
            Set the Secret Word
          </h2>
          <p className="text-slate-600">
            Choose a valid English word that others will try to guess
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="secret-word"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Secret Word
            </label>
            <input
              ref={inputRef}
              id="secret-word"
              type="text"
              value={word}
              onChange={handleInputChange}
              placeholder="Enter a word (3-15 letters)"
              className={`
              w-full rounded-lg border-2 px-4 py-4 text-center font-mono
              text-xl uppercase transition-colors
              ${
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
              }
              focus:outline-none focus:ring-2
            `}
              disabled={disabled || isSubmitting}
              autoComplete="off"
              spellCheck={false}
              maxLength={15}
            />

            <div className="mt-2 flex items-center justify-between">
              <div>
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">{word.length}/15 letters</p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={
              disabled || isSubmitting || !word.trim() || !!validateWord(word)
            }
            className="w-full bg-primary-500 text-white hover:bg-primary-600"
            size="lg"
          >
            {isSubmitting ? "Setting Word..." : "Set Secret Word"}
          </Button>
        </form>

        <div className="space-y-1 text-center text-xs text-slate-500">
          <p>💡 Choose a word that&apos;s challenging but fair</p>
          <p>🎯 The first letter will be revealed immediately</p>
        </div>
      </div>
    );
  }
);

WordSetting.displayName = "WordSetting";
