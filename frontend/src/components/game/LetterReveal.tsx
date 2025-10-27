"use client";

import { memo } from "react";

interface LetterRevealProps {
  secretWord: string;
  revealedCount: number;
  className?: string;
}

export const LetterReveal = memo<LetterRevealProps>(
  ({ secretWord, revealedCount, className = "" }) => {
    const letters = secretWord.toUpperCase().split("");

    // Calculate responsive block size based on word length to fit in one line
    const getBlockSizeClasses = (wordLength: number) => {
      if (wordLength <= 4) {
        return "w-12 h-16 text-2xl sm:w-16 sm:h-20 sm:text-3xl md:w-20 md:h-24 md:text-4xl";
      } else if (wordLength <= 6) {
        return "w-10 h-12 text-xl sm:w-12 sm:h-16 sm:text-2xl md:w-14 md:h-18 md:text-3xl";
      } else if (wordLength <= 8) {
        return "w-8 h-10 text-lg sm:w-10 sm:h-12 sm:text-xl md:w-12 md:h-14 md:text-2xl";
      } else if (wordLength <= 10) {
        return "w-6 h-8 text-base sm:w-8 sm:h-10 sm:text-lg md:w-10 md:h-12 md:text-xl";
      } else if (wordLength <= 12) {
        return "w-5 h-7 text-sm sm:w-6 sm:h-8 sm:text-base md:w-8 md:h-10 md:text-lg";
      } else {
        return "w-4 h-6 text-xs sm:w-5 sm:h-7 sm:text-sm md:w-6 md:h-8 md:text-base";
      }
    };

    const blockSizeClasses = getBlockSizeClasses(letters.length);

    // Always keep letters in one row
    const allLetters = letters;

    return (
      <div
        className={`${className}`}
        role="region"
        aria-label="Secret word display"
      >
        <div className={`flex justify-center overflow-x-auto`}>
          {allLetters.map((letter, index) => {
            const isRevealed = index < revealedCount;

            return (
              <div
                key={index}
                className={`
                ${blockSizeClasses}
                flex flex-shrink-0 items-center justify-center
                border-2 border-slate-300 
                -ml-px first:ml-0
                font-bold transition-all duration-300
                ${
                  isRevealed
                    ? "letter-reveal border-indigo-300 bg-indigo-100 text-indigo-800 shadow-sm"
                    : "border-slate-300 bg-slate-50 text-transparent"
                }
              `}
                aria-label={isRevealed ? `Letter ${letter}` : "Hidden letter"}
                style={isRevealed ? { animationDelay: `${index * 0.1}s` } : {}}
              >
                {isRevealed ? letter : ""}
              </div>
            );
          })}
        </div>

        {/* Screen reader only information */}
        <div className="sr-only">
          Secret word has {letters.length} letters.
          {revealedCount} {revealedCount === 1 ? "letter" : "letters"} revealed:
          {secretWord.slice(0, revealedCount).toUpperCase()}
        </div>
      </div>
    );
  }
);

LetterReveal.displayName = "LetterReveal";
