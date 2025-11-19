"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface LetterBlocksProps {
  secretWord: string;
  revealedCount: number;
  isDirectGuessMode?: boolean;
  onDirectGuessClick?: () => void;
  onSubmit?: (guess: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const LetterBlocks = ({
  secretWord,
  revealedCount,
  isDirectGuessMode = false,
  onDirectGuessClick,
  onSubmit,
  onCancel,
  className = "",
}: LetterBlocksProps) => {
  const letters = secretWord.toUpperCase().split("");
  const wordLength = letters.length;

  // Dynamic sizing based on word length
  const blockSize = Math.max(24, Math.min(48, 300 / wordLength));
  const fontSize = blockSize * 0.5;
  const gap = Math.max(4, Math.min(12, 120 / wordLength));

  // Direct guess state
  const [guessInput, setGuessInput] = useState<string[]>(
    Array(wordLength).fill("")
  );
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset guess input when entering direct guess mode
  useEffect(() => {
    if (isDirectGuessMode) {
      const initialGuess = Array(wordLength).fill("");
      // Pre-fill revealed letters
      for (let i = 0; i < revealedCount; i++) {
        initialGuess[i] = letters[i];
      }
      setGuessInput(initialGuess);
      setFocusedIndex(revealedCount); // Start at first unrevealed letter

      // Focus first unrevealed input after animation
      setTimeout(() => {
        inputRefs.current[revealedCount]?.focus();
      }, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirectGuessMode, secretWord, wordLength, revealedCount]);

  // Click outside handler
  useEffect(() => {
    if (!isDirectGuessMode) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onCancel?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDirectGuessMode, onCancel]);

  // Handle character input
  const handleInputChange = (index: number, value: string) => {
    // Only allow alphabetic characters
    const alphabeticOnly = value.replace(/[^a-zA-Z]/g, "").toUpperCase();

    if (alphabeticOnly.length === 0) return;

    const newGuess = [...guessInput];
    newGuess[index] = alphabeticOnly[alphabeticOnly.length - 1]; // Take last char if multiple
    setGuessInput(newGuess);

    // Auto-advance to next empty block
    const nextEmptyIndex = newGuess.findIndex(
      (char, i) => i > index && char === ""
    );
    if (nextEmptyIndex !== -1) {
      setFocusedIndex(nextEmptyIndex);
      inputRefs.current[nextEmptyIndex]?.focus();
    }
    // Note: Removed auto-submit - only submit on Enter key press
  };

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (guessInput[index] === "" && index > revealedCount) {
        // Move to previous block if current is empty
        e.preventDefault();
        const prevIndex = index - 1;
        setFocusedIndex(prevIndex);
        inputRefs.current[prevIndex]?.focus();
      } else if (guessInput[index] !== "") {
        // Clear current block
        const newGuess = [...guessInput];
        newGuess[index] = "";
        setGuessInput(newGuess);
      }
    } else if (e.key === "ArrowLeft" && index > revealedCount) {
      e.preventDefault();
      const prevIndex = index - 1;
      setFocusedIndex(prevIndex);
      inputRefs.current[prevIndex]?.focus();
    } else if (e.key === "ArrowRight" && index < wordLength - 1) {
      e.preventDefault();
      const nextIndex = index + 1;
      setFocusedIndex(nextIndex);
      inputRefs.current[nextIndex]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const fullGuess = guessInput.join("");
      if (fullGuess.length === wordLength) {
        onSubmit?.(fullGuess);
      }
    }
  };

  return (
    <>
      {/* Backdrop blur overlay */}
      <AnimatePresence>
        {isDirectGuessMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-md"
          />
        )}
      </AnimatePresence>

      {/* Letter blocks container */}
      <motion.div
        ref={containerRef}
        layout
        className={`flex items-center justify-center ${className}`}
        animate={{
          scale: isDirectGuessMode ? 1.03 : 1,
          y: isDirectGuessMode ? -8 : 0,
          z: isDirectGuessMode ? 50 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        style={{
          zIndex: isDirectGuessMode ? 50 : 10,
          position: "relative",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ gap: `${gap}px` }}
        >
          {letters.map((letter, index) => {
            const isRevealed = index < revealedCount;
            const isEditable = isDirectGuessMode && index >= revealedCount;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.4 + index * 0.05, // Delay after card entrance
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                className={`
                  flex items-center justify-center 
                  border-2 border-black bg-white font-bold
                  transition-all duration-200
                  ${
                    isDirectGuessMode && focusedIndex === index && isEditable
                      ? "shadow-lg ring-4 ring-black ring-opacity-30"
                      : ""
                  }
                  ${isEditable ? "cursor-text" : ""}
                `}
                style={{
                  width: `${blockSize}px`,
                  height: `${blockSize}px`,
                  minWidth: `${Math.max(blockSize, 44)}px`, // Ensure touch targets
                  minHeight: `${Math.max(blockSize, 44)}px`,
                }}
              >
                {isDirectGuessMode && isEditable ? (
                  // Input mode for unrevealed letters
                  <input
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={guessInput[index]}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={() => setFocusedIndex(index)}
                    className="h-full w-full border-none bg-transparent text-center font-bold uppercase outline-none"
                    style={{
                      fontSize: `${fontSize}px`,
                      color: "#000000",
                    }}
                    aria-label={`Letter ${index + 1}`}
                  />
                ) : (
                  // Display mode
                  <span
                    className="font-bold uppercase"
                    style={{
                      fontSize: `${fontSize}px`,
                      color: isRevealed ? "#000000" : "transparent",
                    }}
                  >
                    {isRevealed ? letter : ""}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
};
