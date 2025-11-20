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
import {
  ActionBar,
  LetterBlocks,
  RoundButton,
  RoundButtonIcon,
  RoomInfoButton,
} from "@/components/beta";
import { AnimatePresence, motion } from "framer-motion";

// Define card types
type CardType = "waiting" | "enter-secret" | "send-signull" | "signull";

type BaseCardData = {
  id: number;
  type: CardType;
};

type WaitingCardData = BaseCardData & {
  type: "waiting";
};

type EnterSecretCardData = BaseCardData & {
  type: "enter-secret";
};

type SendSignullCardData = BaseCardData & {
  type: "send-signull";
};

type SignullCardData = BaseCardData & {
  type: "signull";
  username: string;
  receivedConnects: number;
  requiredConnects: number;
  totalActiveGuessers: number;
  message: string;
  messageHistory?: Array<{
    id: string;
    username: string;
    message: string;
    timestamp?: string;
  }>;
};

type CardData =
  | WaitingCardData
  | EnterSecretCardData
  | SendSignullCardData
  | SignullCardData;

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
  const [word] = useState("elephant");
  const [revealedCount] = useState(3); // First 3 letters revealed (O, X, Y)
  const [isWordSet] = useState(true); // Controls letter block visibility
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDirectGuessMode, setIsDirectGuessMode] = useState(false);
  const [directGuessesLeft] = useState(3); // Number of direct guesses remaining
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isComposingSignull, setIsComposingSignull] = useState(false);
  const [signullClue, setSignullClue] = useState("");
  const [signullWord, setSignullWord] = useState("");

  // Card stack state
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextCardId, setNextCardId] = useState(5);
  const [cards, setCards] = useState<CardData[]>([
    { id: 2, type: "enter-secret" },
    {
      id: 4,
      type: "signull",
      username: "DUMBFOX",
      receivedConnects: 2,
      requiredConnects: 3,
      totalActiveGuessers: 5,
      message:
        "What do you call a three humped camel? Quick! What do you call a three humped camel? ",
      messageHistory: [
        {
          id: "1",
          username: "ROGI",
          message: "Portal opened at /undefined. Find it. Quick!",
          timestamp: "2m ago",
        },
        {
          id: "2",
          username: "ROGI",
          message: "I am ROGI. I speak in riddles.",
          timestamp: "3m ago",
        },
        {
          id: "3",
          username: "SYSTEM",
          message: "DumbFox session initiated.",
          timestamp: "5m ago",
        },
        {
          id: "4",
          username: "ROGI",
          message: "To find the truth, one must first embrace the absurd.",
          timestamp: "7m ago",
        },
        {
          id: "5",
          username: "USER",
          message: "What is the meaning of OXF?",
          timestamp: "8m ago",
        },
        {
          id: "6",
          username: "ROGI",
          message:
            "A key, a code, a path untold. The beast of burden, wise and old.",
          timestamp: "10m ago",
        },
        {
          id: "7",
          username: "USER",
          message: "Give me a hint.",
          timestamp: "12m ago",
        },
        {
          id: "8",
          username: "ROGI",
          message:
            "The fox is clever, but the ox is strong. Three letters to right the wrong.",
          timestamp: "15m ago",
        },
      ],
    },
    { id: 1, type: "waiting" },
  ]);

  // Placeholder player data
  const [players] = useState([
    { id: "1", name: "DUMBFOX", role: "setter" as const },
    { id: "2", name: "ROGI", role: "guesser" as const },
    { id: "3", name: "PLAYER3", role: "guesser" as const },
    { id: "4", name: "PLAYER4", role: "guesser" as const },
  ]);
  const [connectsRequired] = useState(3);
  const [currentUsername] = useState("PLAYER2"); // TODO: Get from store/auth
  const [selectedCardHistory, setSelectedCardHistory] = useState<
    Array<{
      id: string;
      username: string;
      message: string;
      timestamp?: string;
    }>
  >([]);

  // Refs for scroll control
  const headerRef = useRef<HTMLDivElement>(null);
  const letterBlocksRef = useRef<HTMLDivElement>(null);

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

  // Handle swipe left (next card)
  const handleSwipeLeft = () => {
    if (activeIndex < cards.length - 1) {
      setActiveIndex((prev) => prev + 1);
      // Reset composing state if we swipe away from a composing card?
      // For now, let's keep the state so user can return to it.
    }
  };

  // Handle swipe right (previous card)
  const handleSwipeRight = () => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  // Handle Signull button click - insert send-signull card
  const handleSignullClick = () => {
    if (isComposingSignull) {
      showNotification("Already composing a Signull");
      return;
    }

    // Insert send-signull card at the front of the stack
    const newCard: SendSignullCardData = {
      id: nextCardId,
      type: "send-signull",
    };
    setCards((prev) => [newCard, ...prev]);
    setNextCardId((prev) => prev + 1);
    setActiveIndex(0); // Jump to the new card
    setIsComposingSignull(true);
    setSignullClue("");
    setSignullWord("");
    setInputValue("");
    showNotification("Compose your Signull");
  };

  // Handle submit - validate and transform send-signull card into signull card
  const handleSignullSubmit = () => {
    if (!isComposingSignull) {
      // Normal submit behavior when not composing signull
      if (inputValue.trim()) {
        showNotification(`Submitted: ${inputValue}`);
        setInputValue("");
      }
      return;
    }

    // Validate clue and word
    if (!signullClue.trim()) {
      showNotification("Please enter a clue message");
      return;
    }

    if (!signullWord.trim()) {
      showNotification("Please enter the reference word");
      return;
    }

    // TODO: Add validation for word prefix matching secret word

    // Transform the send-signull card into a signull card
    const newSignullCard: SignullCardData = {
      id: nextCardId,
      type: "signull",
      username: currentUsername,
      receivedConnects: 0,
      requiredConnects: connectsRequired,
      totalActiveGuessers: players.filter((p) => p.role === "guesser").length,
      message: signullClue.trim(),
      messageHistory: [
        {
          id: `${nextCardId}-initial`,
          username: currentUsername,
          message: signullClue.trim(),
          timestamp: "Just now",
        },
      ],
    };

    // Replace the send-signull card with the new signull card
    setCards((prev) => {
      const updatedCards = [...prev];
      // We assume the active card is the one being submitted if we are in composing mode
      // But to be safe, we find the send-signull card
      const sendSignullIndex = updatedCards.findIndex(
        (c) => c.type === "send-signull"
      );
      if (sendSignullIndex !== -1) {
        updatedCards[sendSignullIndex] = newSignullCard;
      }
      return updatedCards;
    });

    setNextCardId((prev) => prev + 1);
    setIsComposingSignull(false);
    setSignullClue("");
    setSignullWord("");
    setInputValue("");
    showNotification(`Signull sent: ${signullWord.trim()}`);
  };

  // Handle response to a SignullCard
  const handleConnect = () => {
    if (!inputValue.trim()) {
      return;
    }

    const currentCard = cards[activeIndex];

    // Check if the current card is a SignullCard
    if (currentCard?.type !== "signull") {
      showNotification(`Submitted: ${inputValue}`);
      setInputValue("");
      return;
    }

    // Create a new message entry
    const newMessage = {
      id: `${currentCard.id}-${Date.now()}`,
      username: currentUsername,
      message: inputValue.trim(),
      timestamp: "Just now",
    };

    // Update the card's message history
    setCards((prev) => {
      const updatedCards = [...prev];
      const signullCard = updatedCards[activeIndex] as SignullCardData;

      updatedCards[activeIndex] = {
        ...signullCard,
        messageHistory: [newMessage, ...(signullCard.messageHistory || [])],
      };

      return updatedCards;
    });

    showNotification(`Response sent to ${currentCard.username}`);
    setInputValue("");
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

  // Handle history card click
  const handleSignullCardClick = (
    history?: Array<{
      id: string;
      username: string;
      message: string;
      timestamp?: string;
    }>
  ) => {
    if (history && history.length > 0) {
      setSelectedCardHistory(history);
      setIsHistoryOpen(true);
    }
  };

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
    setTimeout(() => setSelectedCardHistory([]), 300); // Clear after animation
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-200 p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, constrained on desktop */}
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-neutral-100 md:h-[calc(100dvh-2rem)] md:rounded-3xl md:shadow-2xl">
        {/* SECTION 1: Top Header Bar */}
        <header
          ref={headerRef}
          className={`sticky top-0 z-50 flex h-16 items-center justify-between gap-3 bg-neutral-100 px-4 py-2 transition-all duration-200 ${isDirectGuessMode || isHistoryOpen ? "pointer-events-none opacity-50 blur-sm" : ""}`}
        >
          {/* Room Info Button */}
          <RoomInfoButton
            roomCode={roomCode}
            players={players}
            connectsRequired={connectsRequired}
          />

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
          <div
            className={`px-6 transition-all duration-200 ${isHistoryOpen ? "pointer-events-none opacity-50 blur-sm" : ""}`}
          >
            <LetterBlocks
              secretWord={word}
              revealedCount={revealedCount}
              isDirectGuessMode={isDirectGuessMode}
              onSubmit={handleDirectGuessSubmit}
              onCancel={handleDirectGuessCancel}
              className="my-4"
            />
          </div>
        )}

        {/* SECTION 4: Card Container - Main Game Area */}
        <div
          className={`relative flex-shrink-0 overflow-visible px-6 transition-all duration-300 ${isHistoryOpen ? "translate-y-[-100px]" : ""}`}
        >
          {/* Navigation Arrows */}
          <div className="absolute left-0 top-1/2 z-[60] -translate-y-1/2 pl-1">
            <button
              onClick={handleSwipeLeft}
              disabled={activeIndex === cards.length - 1}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm transition-all hover:bg-white disabled:opacity-0"
              aria-label="Next card"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          <div className="absolute right-0 top-1/2 z-[60] -translate-y-1/2 pr-1">
            <button
              onClick={handleSwipeRight}
              disabled={activeIndex === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm transition-all hover:bg-white disabled:opacity-0"
              aria-label="Previous card"
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div
            className="relative mx-auto my-2 max-w-md"
            style={{ aspectRatio: "3 / 2" }}
          >
            {/* Render stacked cards */}
            {cards.map((card, index) => {
              const offset = index - activeIndex;
              const isActive = offset === 0;

              // Optimization: Only render cards within a certain range
              if (Math.abs(offset) > 2) return null;

              // Calculate styles based on offset
              // Left stack (offset > 0): Future cards, shift left
              // Right stack (offset < 0): Past cards, shift right
              const xOffset = offset * -25; // Inverted: positive offset (future) goes left (negative x)
              const scale = 1 - Math.abs(offset) * 0.05;
              const rotation = offset * -2; // Inverted rotation
              const opacity = 1 - Math.abs(offset) * 0.1;
              const zIndex = 50 - Math.abs(offset);

              // Render appropriate card content based on type
              const renderCardContent = () => {
                switch (card.type) {
                  case "waiting":
                    return <WaitingCard />;
                  case "enter-secret":
                    return <EnterSecretWordCard />;
                  case "send-signull":
                    return (
                      <SendASignullCard
                        clueMessage={signullClue}
                        onClueChange={setSignullClue}
                        autoFocus={isActive}
                      />
                    );
                  case "signull":
                    return (
                      <SignullCard
                        username={card.username}
                        receivedConnects={card.receivedConnects}
                        requiredConnects={card.requiredConnects}
                        totalActiveGuessers={card.totalActiveGuessers}
                        message={card.message}
                        onClick={() =>
                          handleSignullCardClick(card.messageHistory)
                        }
                        messageHistory={card.messageHistory}
                      />
                    );
                  default:
                    return null;
                }
              };

              return (
                <motion.div
                  key={card.id}
                  className="absolute left-0 right-0"
                  initial={false}
                  animate={{
                    x: xOffset,
                    scale,
                    rotate: rotation,
                    opacity,
                    zIndex,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                  }}
                  style={{
                    transformOrigin: "center bottom",
                  }}
                >
                  <BaseCard
                    state={isActive ? "active" : "stacked"}
                    className={
                      card.type === "waiting"
                        ? "border-2 border-dashed border-black"
                        : "border-2 border-black"
                    }
                    stackIndex={Math.abs(offset)}
                  >
                    <div style={{ aspectRatio: "3 / 2" }}>
                      {renderCardContent()}
                    </div>
                  </BaseCard>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* SECTION 5: Bottom Action Bar */}
        <ActionBar
          inputValue={isComposingSignull ? signullWord : inputValue}
          onInputChange={(value) => {
            if (isComposingSignull) {
              setSignullWord(value);
            } else {
              setInputValue(value);
            }
          }}
          onInputFocus={handleInputFocus}
          onSignullClick={handleSignullClick}
          onSubmit={isComposingSignull ? handleSignullSubmit : handleConnect}
          placeholder={isComposingSignull ? "Enter reference word" : "OXF"}
          disableSubmit={
            isComposingSignull
              ? !signullClue.trim() || !signullWord.trim()
              : !inputValue.trim()
          }
        />

        {/* Keyboard Safe Area - Dynamic padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />

        {/* History Overlay */}
        <AnimatePresence>
          {isHistoryOpen && (
            <>
              {/* Backdrop / Close Area */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-[70] bg-black/20"
                onClick={handleCloseHistory}
              />

              {/* History Cards Container - Positioned below the main card */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute bottom-0 left-0 right-0 z-[80] flex flex-col px-6 pb-6"
                style={{
                  maxHeight: "calc(100dvh - 300px)", // Leave space for header and main card
                }}
              >
                {/* History Header */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-wider text-black">
                    Signull Log
                  </span>
                  <button
                    onClick={handleCloseHistory}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white transition-colors hover:bg-neutral-100"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Scrollable History Cards */}
                <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl">
                  {selectedCardHistory.map((historyItem) => (
                    <motion.div
                      key={historyItem.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl border-2 border-black bg-white p-4 shadow-md"
                    >
                      {/* History Card Header */}
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-black">
                          {historyItem.username}
                        </span>
                        {historyItem.timestamp && (
                          <span className="text-xs text-neutral-500">
                            {historyItem.timestamp}
                          </span>
                        )}
                      </div>

                      {/* History Card Message */}
                      <p className="text-sm leading-relaxed text-black">
                        {historyItem.message}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
