"use client";

import { useRef } from "react";
import { RoundButton, RoundButtonIcon } from "@/components/beta";

interface ActionBarProps {
  /** Value of the input field */
  inputValue: string;
  /** Callback when input value changes */
  onInputChange: (value: string) => void;
  /** Callback when input is focused */
  onInputFocus?: () => void;
  /** Callback when Signull button is clicked */
  onSignullClick: () => void;
  /** Callback when Submit/Next button is clicked */
  onSubmit: () => void;
  /** Placeholder text for input */
  placeholder?: string;
  /** Whether the submit button should be disabled */
  disableSubmit?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ActionBar({
  inputValue,
  onInputChange,
  onInputFocus,
  onSignullClick,
  onSubmit,
  placeholder = "Enter text",
  disableSubmit = false,
  className = "",
}: ActionBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`z-50 mt-6 flex h-20 flex-shrink-0 items-center gap-3 bg-neutral-100 px-6 pb-6 transition-all duration-200 ${className}`}
    >
      {/* Signull Button */}
      <RoundButton size="lg" onClick={onSignullClick} title="Send Signull">
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
      <div className="flex flex-1 items-center justify-center rounded-full border-2 border-black bg-white px-4 py-3">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={onInputFocus}
          placeholder={placeholder}
          className="w-full bg-transparent text-center text-base font-medium tracking-widest text-black placeholder-neutral-400 focus:outline-none"
        />
      </div>

      {/* Submit/Next Button */}
      <RoundButton
        size="lg"
        onClick={onSubmit}
        disabled={disableSubmit}
        className="disabled:border-neutral-300 disabled:bg-neutral-100"
      >
        <RoundButtonIcon size="lg">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 5l7 7-7 7"
            />
          </svg>
        </RoundButtonIcon>
        <RoundButtonIcon size="lg" className="-ml-4">
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
