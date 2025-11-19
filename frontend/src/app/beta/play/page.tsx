"use client";

import { useState, useRef, useEffect } from "react";
import { CardContainer } from "@/components/beta/cards/CardContainer";
import { BaseCard } from "@/components/beta/cards/BaseCard";
import {
  WaitingCard,
  EnterSecretWordCard,
  SendASignullCard,
  SignullCard,
} from "@/components/beta/cards";
import { LetterBlocks, RoundButton, RoundButtonIcon } from "@/components/beta";
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
  const [revealedCount] = useState(3); // First 3 letters revealed (O, X, Y)
  const [isWordSet] = useState(true); // Controls letter block visibility
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDirectGuessMode, setIsDirectGuessMode] = useState(false);
  const [directGuessesLeft] = useState(3); // Number of direct guesses remaining

  // Refs for scroll control
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const letterBlocksRef = useRef<HTMLDivElement>(null);

  // Card stack state
  const [cards, setCards] = useState([
    { id: 2, type: "enter-secret" as const },
    { id: 3, type: "send-signull" as const },
    {
      id: 4,
      type: "signull" as const,
      username: "DUMBFOX",
      receivedConnects: 2,
      requiredConnects: 3,
      totalActiveGuessers: 5,
      message:
        "What do you call a three humped camel? Quick! What do you call a three humped camel? ",
    },
    { id: 1, type: "waiting" as const },
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

  // Handle direct guess
  const handleDirectGuessClick = () => {
    setIsDirectGuessMode(true);
  };

  const handleDirectGuessSubmit = (guess: string) => {
    showNotification(`Direct guess: ${guess}`);
    setIsDirectGuessMode(false);
    // TODO: Implement actual guess submission logic
  };

  const handleDirectGuessCancel = () => {
    setIsDirectGuessMode(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-200 p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, constrained on desktop */}
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-neutral-100 md:h-[calc(100dvh-2rem)] md:rounded-3xl md:shadow-2xl">
        {/* SECTION 1: Top Header Bar */}
        <header
          ref={headerRef}
          className={`sticky top-0 z-50 flex h-16 items-center justify-between gap-3 bg-neutral-100 px-4 py-2 transition-all duration-200 ${isDirectGuessMode ? "pointer-events-none opacity-50 blur-sm" : ""}`}
        >
          {/* Left Arrow Button */}
          <RoundButton size="md" onClick={() => showNotification("Room Info")}>
            <RoundButtonIcon size="md">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </RoundButtonIcon>
          </RoundButton>

          {/* Direct Guess Button / Counter */}
          {isDirectGuessMode ? (
            // Show guesses counter during direct guess mode (not blurred)
            <div className="absolute right-4 top-2 z-[60] flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-black bg-white">
              <span className="text-lg font-bold text-black">
                {directGuessesLeft}
              </span>
            </div>
          ) : (
            // Show direct guess button normally
            <RoundButton
              size="md"
              onClick={handleDirectGuessClick}
              disabled={isDirectGuessMode}
              title="Direct Guess"
            >
              <RoundButtonIcon size="md">
                <svg viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M680-320v-360H320v-80h440v440h-80ZM480-120v-360H120v-80h440v440h-80Z" />
                </svg>
              </RoundButtonIcon>
            </RoundButton>
          )}
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
        {isWordSet && (
          <LetterBlocks
            secretWord={word}
            revealedCount={revealedCount}
            isDirectGuessMode={isDirectGuessMode}
            onSubmit={handleDirectGuessSubmit}
            onCancel={handleDirectGuessCancel}
            className="my-4"
          />
        )}

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

              // Render appropriate card content based on type
              const renderCardContent = () => {
                switch (card.type) {
                  case "waiting":
                    return <WaitingCard />;
                  case "enter-secret":
                    return <EnterSecretWordCard />;
                  case "send-signull":
                    return <SendASignullCard />;
                  case "signull":
                    return (
                      <SignullCard
                        username={card.username || "PLAYER"}
                        receivedConnects={card.receivedConnects || 2}
                        requiredConnects={card.requiredConnects || 3}
                        totalActiveGuessers={card.totalActiveGuessers || 5}
                        message={card.message || ""}
                      />
                    );
                  default:
                    return null;
                }
              };

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
                    className={
                      card.type === "waiting"
                        ? "border-2 border-dashed border-black"
                        : "border-2 border-black"
                    }
                    stackIndex={stackIndex}
                  >
                    <div style={{ aspectRatio: "3 / 2" }}>
                      {renderCardContent()}
                    </div>
                  </BaseCard>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 5: Bottom Action Bar */}
        <footer
          className={`z-50 mt-6 flex h-20 flex-shrink-0 items-center gap-3 bg-neutral-100 px-6 pb-6 transition-all duration-200 ${isDirectGuessMode ? "pointer-events-none opacity-50 blur-sm" : ""}`}
        >
          {/* Direct Guess Button */}
          <RoundButton size="lg" title="Direct Guess">
            <RoundButtonIcon size="lg">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="OXF"
              className="w-full bg-transparent text-center text-base font-medium tracking-widest text-black placeholder-neutral-400 focus:outline-none"
            />
          </div>

          {/* Submit/Next Button */}
          <RoundButton
            size="lg"
            onClick={() => {
              if (inputValue.trim()) {
                showNotification(`Submitted: ${inputValue}`);
                setInputValue("");
              }
            }}
            disabled={!inputValue.trim()}
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
        </footer>

        {/* Keyboard Safe Area - Dynamic padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
