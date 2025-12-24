"use client";

import { useRef, useState } from "react";
import { RoundButton, RoundButtonIcon } from "@/components/beta";

interface ActionBarProps {
  /** Value of the input field */
  inputValue: string;
  /** Callback when input value changes */
  onInputChange: (value: string) => void;
  /** Callback when input is focused */
  onInputFocus?: () => void;
  /** Callback when input loses focus */
  onInputBlur?: () => void;
  /** Callback when Signull button is clicked */
  onSignullClick: () => void;
  /** Callback when Submit/Next button is clicked */
  onSubmit: () => void;
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether the submit button should be disabled */
  disableSubmit?: boolean;
  /** Whether the input field should be disabled */
  disableInput?: boolean;
  /** Whether the signull button should be disabled */
  disableSignull?: boolean;
  /** Whether the Signull button is pressed */
  isSignullPressed?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether the game has ended */
  isGameEnded?: boolean;
  /** Callback when Play Again button is clicked */
  onPlayAgain?: () => void;
  /** Callback when Back to Lobby button is clicked */
  onBackToLobby?: () => void;
  /** Callback when Memories button is clicked */
  onMemoriesClick?: () => void;
}

export function ActionBar({
  inputValue,
  onInputChange,
  onInputFocus,
  onInputBlur,
  onSignullClick,
  onSubmit,
  placeholder = "Enter text",
  disableSubmit = false,
  disableInput = false,
  disableSignull = false,
  className = "",
  isGameEnded = false,
  onPlayAgain,
  onBackToLobby,
  onMemoriesClick,
  isSignullPressed,
}: ActionBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // const [isSignullPressed, setIsSignullPressed] = useState(false);

  // const handleSignullClick = () => {
  //   setIsSignullPressed(!isSignullPressed);
  //   onSignullClick();
  // };

  const handleSubmit = () => {
    // setIsSignullPressed(false);
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Only submit if the submit button is not disabled
      if (!disableSubmit) {
        handleSubmit();
      }
    }
  };

  if (isGameEnded) {
    return (
      <div
        className={`z-50 mt-4 flex flex-shrink-0 flex-col items-center justify-center gap-3 bg-neutral-100 p-4 pb-6 transition-all duration-200 ${className}`}
      >
        {/* Top row: Back to Lobby and Play Again */}
        <div className="flex w-full justify-center gap-3">
          <button
            onClick={onBackToLobby}
            className="flex h-12 items-center justify-center rounded-full border-2 border-black bg-neutral-200 px-6 text-sm font-bold uppercase tracking-wider text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
          >
            Back to Lobby
          </button>
          <button
            onClick={onPlayAgain}
            className="flex h-12 items-center justify-center rounded-full border-2 border-black bg-white px-6 text-sm font-bold uppercase tracking-wider text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
          >
            Play Again
          </button>
        </div>

        {/* Bottom row: Memories button */}
        {/* {onMemoriesClick && (
          <button
            onClick={onMemoriesClick}
            className="flex h-10 items-center justify-center rounded-full border-2 border-black bg-purple-100 px-6 text-xs font-bold uppercase tracking-wider text-purple-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
          >
            📸 Memories
          </button>
        )} */}
      </div>
    );
  }

  return (
    <div
      className={`z-50 mt-4 flex h-20 flex-shrink-0 items-center gap-3 bg-neutral-100 p-6 transition-all duration-200 ${className}`}
    >
      {/* Signull Button */}
      <RoundButton
        id="tour-action-bar-signull"
        size="lg"
        onClick={onSignullClick}
        title="Send Signull"
        disabled={disableSignull}
        className={`disabled:cursor-not-allowed disabled:opacity-50 ${
          isSignullPressed ? "translate-y-[2px] bg-yellow-100 shadow-none" : ""
        }`}
      >
        <RoundButtonIcon size="lg">
          <svg fill="yellow" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </RoundButtonIcon>
      </RoundButton>

      {/* Input Field */}
      <div
        id="tour-action-bar-input"
        className={`flex flex-1 items-center justify-center rounded-full border-2 border-black bg-white px-4 py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${disableInput ? "bg-neutral-200 opacity-50" : "focus-within:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disableInput}
          className={`w-full bg-transparent text-center text-base font-medium tracking-widest text-black placeholder-neutral-400 focus:outline-none disabled:cursor-not-allowed`}
        />
      </div>

      {/* Submit Button */}
      <RoundButton
        id="tour-action-bar-submit"
        size="lg"
        onClick={handleSubmit}
        disabled={disableSubmit}
        className="disabled:border-neutral-300 disabled:bg-neutral-100"
      >
        <RoundButtonIcon size="sm">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 5l7 7-7 7"
            />
          </svg>
        </RoundButtonIcon>
        <RoundButtonIcon size="sm" className="-ml-2">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 5l7 7-7 7"
            />
          </svg>
        </RoundButtonIcon>
      </RoundButton>
    </div>
  );
}
