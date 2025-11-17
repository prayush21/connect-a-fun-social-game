"use client";

import { useState, useRef, useEffect } from "react";
import { CardContainer } from "@/components/beta/cards/CardContainer";
import { BaseCard } from "@/components/beta/cards/BaseCard";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Beta Play Page - Card-Based Game Interface
 *
 * Layout Structure:
 * 1. Top Header Bar - Room code & actions
 * 2. Notification Area - Reserved space for toasts
 * 3. Letter Blocks Display - Word progress
 * 4. Card Container - Main game state card
 * 5. Bottom Action Bar - Input & navigation
 */
export default function BetaPlayPage() {
  // Placeholder state
  const [roomCode] = useState("ABCD");
  const [notification, setNotification] = useState<string | null>(null);
  const [word] = useState("OXYGEN");
  const [revealedLetters] = useState([0, 1, 2]); // O, X, F revealed
  const [isWordSet] = useState(true); // Controls letter block visibility
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Refs for scroll control
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const letterBlocksRef = useRef<HTMLDivElement>(null);

  // Card stack state
  const [cards, setCards] = useState([
    { id: 1, title: "Card 1", content: "Enter the Secret Word" },
    { id: 2, title: "Card 2", content: "Waiting for players..." },
    { id: 3, title: "Card 3", content: "Make your guess" },
  ]);

  // Handle input focus - scroll to hide just the header
  const handleInputFocus = () => {
    // Small delay to allow keyboard to start showing
    setTimeout(() => {
      if (letterBlocksRef.current) {
        letterBlocksRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      }
    }, 100);
  };

  // Placeholder notification trigger
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle swipe to remove top card
  const handleSwipe = () => {
    setCards((prev) => prev.slice(1));
    showNotification("Card swiped!");
  };

  // Calculate dynamic letter block sizing
  const wordLength = word.length;
  const blockSize = Math.max(24, Math.min(48, 300 / wordLength));
  const fontSize = blockSize * 0.5;
  const gap = Math.max(4, Math.min(12, 120 / wordLength));

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-200 p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, constrained on desktop */}
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-neutral-100 md:h-[calc(100dvh-2rem)] md:rounded-3xl md:shadow-2xl">
        {/* SECTION 1: Top Header Bar */}
        <header
          ref={headerRef}
          className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 bg-neutral-100 px-4 py-2"
        >
          {/* Left Arrow Button */}
          <button
            onClick={() => showNotification("Navigate back")}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-black bg-white p-2 transition-all hover:bg-neutral-50 active:scale-95"
          >
            <span>
              <svg
                className="h-5 w-5 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </span>
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={() => showNotification("History feature coming soon!")}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-white transition-all hover:bg-neutral-50 active:scale-95"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 -960 960 960"
              fill="currentColor"
            >
              <path d="M680-320v-360H320v-80h440v440h-80ZM480-120v-360H120v-80h440v440h-80Z" />
            </svg>
          </button>
        </header>

        {/* SECTION 2: Notification Area - Reserved Space */}
        <div className="relative h-0 w-full">
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-1/2 top-2 z-50 -translate-x-1/2"
              >
                <div className="rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-medium text-black shadow-lg">
                  {notification}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 3: Letter Blocks Display */}
        <AnimatePresence>
          {isWordSet && (
            <motion.div
              ref={letterBlocksRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, staggerChildren: 0.05 }}
              className="my-4 flex items-center justify-center px-4"
            >
              <div
                className="flex items-center justify-center"
                style={{ gap: `${gap}px` }}
              >
                {word.split("").map((letter, index) => {
                  const isRevealed = revealedLetters.includes(index);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-center border-2 border-black bg-white font-bold"
                      style={{
                        width: `${blockSize}px`,
                        height: `${blockSize}px`,
                        fontSize: `${fontSize}px`,
                        color: isRevealed ? "#000000" : "transparent",
                      }}
                    >
                      {isRevealed ? letter : ""}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION 4: Card Container - Main Game Area */}
        <div className="relative flex-shrink-0 overflow-visible px-6">
          <div
            className="relative mx-auto my-2 w-full max-w-xs"
            style={{ aspectRatio: "3 / 2" }}
          >
            {/* Render stacked cards from back to front */}
            {cards.slice(0, 3).map((card, index) => {
              const stackIndex = index;
              const isTopCard = stackIndex === 0;
              const scale = 1 - stackIndex * 0.03;
              const xOffset = -stackIndex * 12; // Negative for left offset
              const opacity = 1 - stackIndex * 0.15;

              return (
                <div
                  key={card.id}
                  className="absolute left-0 right-0 transition-all duration-300 ease-out"
                  style={{
                    transform: `translateX(${xOffset}px) scale(${scale})`,
                    opacity,
                    zIndex: 10 - stackIndex,
                    transformOrigin: "center left",
                  }}
                >
                  <BaseCard
                    state={isTopCard ? "active" : "stacked"}
                    disableSwipe={!isTopCard}
                    onSwipeLeft={isTopCard ? handleSwipe : undefined}
                    onSwipeRight={isTopCard ? handleSwipe : undefined}
                    className="border-2 border-black"
                    stackIndex={stackIndex}
                  >
                    <div
                      className="flex flex-col items-center justify-center bg-white p-4"
                      style={{ aspectRatio: "3 / 2" }}
                    >
                      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-400">
                        {card.title}
                      </div>
                      <h2 className="text-center text-sm font-bold uppercase tracking-wider text-black">
                        {card.content}
                      </h2>
                    </div>
                  </BaseCard>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 5: Bottom Action Bar */}
        <footer className="z-50 mt-6 flex h-20 flex-shrink-0 items-center gap-3 bg-neutral-100 px-6 pb-6">
          {/* History/Back Button */}
          <button
            onClick={() => showNotification("Showing history...")}
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-black bg-white transition-all hover:bg-neutral-50 active:scale-95"
          >
            <svg
              className="h-6 w-6 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Input Field */}
          <div className="flex flex-1 items-center justify-center rounded-full border-2 border-black bg-white px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="OXF"
              className="w-full bg-transparent text-center text-base font-medium tracking-widest text-black placeholder-neutral-400 focus:outline-none"
            />
          </div>

          {/* Submit/Next Button */}
          <button
            onClick={() => {
              if (inputValue.trim()) {
                showNotification(`Submitted: ${inputValue}`);
                setInputValue("");
              }
            }}
            disabled={!inputValue.trim()}
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-black bg-white transition-all hover:bg-neutral-50 active:scale-95 disabled:border-neutral-300 disabled:bg-neutral-100"
          >
            <svg
              className="h-6 w-6 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 5l7 7-7 7"
              />
            </svg>
            <svg
              className="-ml-4 h-6 w-6 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 5l7 7-7 7"
              />
            </svg>
          </button>
        </footer>

        {/* Keyboard Safe Area - Dynamic padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
