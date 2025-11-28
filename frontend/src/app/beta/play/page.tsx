"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
import { useBetaStore } from "@/lib/beta/store";
import { useGame, useIsSetter } from "@/lib/beta/selectors";
import type { SignullEntry, SignullStatus } from "@/lib/beta/types";
import { useRouter } from "next/navigation";

// Define card types
type CardType = "waiting" | "enter-secret" | "send-signull" | "signull";

type BaseCardData = {
  id: number | string;
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
  playerId: string;
  username: string;
  receivedConnects: number;
  requiredConnects: number;
  totalActiveGuessers: number;
  message: string;
  status: SignullStatus;
  hasConnected: boolean;
  isIntercepted?: boolean;
  isInactive?: boolean;
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
  const router = useRouter();

  // Store hooks
  const game = useGame();
  const userId = useBetaStore((state) => state.userId);
  const username = useBetaStore((state) => state.username);
  const isSetter = useIsSetter();
  const addSignull = useBetaStore((state) => state.addSignull);
  const submitConnect = useBetaStore((state) => state.submitConnect);
  const submitDirectGuess = useBetaStore((state) => state.submitDirectGuess);
  const setSecretWord = useBetaStore((state) => state.setSecretWord);
  const resetGame = useBetaStore((state) => state.resetGame);

  // Derived state from store
  const roomCode = game?.roomId || "----";
  const word = game?.secretWord || "";
  const revealedCount = game?.revealedCount || 0;
  const isWordSet = !!game?.secretWord;
  const players = useMemo(
    () => Object.values(game?.players || {}),
    [game?.players]
  );

  //Redirec to beta home page if no roomId
  useEffect(() => {
    if (!game?.roomId) {
      router.push("/beta");
    }
  }, [game?.roomId, router]);

  // Redirect to lobby if phase changes to lobby
  useEffect(() => {
    if (game?.phase === "lobby") {
      router.push("/beta/lobby");
    }
  }, [game?.phase, router]);

  const connectsRequired = game?.settings.connectsRequired || 3;
  const directGuessesLeft = game?.directGuessesLeft || 0;
  const currentUsername = username || "Guest";

  // Local UI state
  const [notification, setNotification] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDirectGuessMode, setIsDirectGuessMode] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isComposingSignull, setIsComposingSignull] = useState(false);
  const [signullClue, setSignullClue] = useState("");
  const [signullWord, setSignullWord] = useState("");

  // Card stack state
  const [activeIndex, setActiveIndex] = useState(0);

  // Transform game state to cards
  const cards = useMemo<CardData[]>(() => {
    if (!game) return [{ id: -1, type: "waiting" }];

    const mappedCards: CardData[] = [];

    // 1. Add Signull cards (reversed order to show newest first)
    // We need to map SignullEntry to SignullCardData
    const signullCards: SignullCardData[] = Object.keys(game.signullState.order)
      .map(Number)
      .sort((a, b) => a - b)
      .reduce(
        (acc, key) => acc.concat(game.signullState.order[String(key)]),
        [] as string[]
      )
      .reverse()
      .map((signullId): SignullCardData | null => {
        const entry = game.signullState.itemsById[signullId];
        if (!entry) return null;

        // Calculate stats
        const totalActiveGuessers = Object.values(game.players).filter(
          (p) => p.role === "guesser"
        ).length;

        // Map history
        const messageHistory = entry.connects.map((c, idx) => ({
          id: `${entry.id}-msg-${idx}`,
          username: game.players[c.playerId]?.name || "Unknown",
          message: c.guess, // In real game, this might be hidden until resolved?
          // Actually connects are guesses.
          // The message history in the mock was chat-like.
          // In the real game, it's guesses.
          timestamp: "Just now", // TODO: Format timestamp
        }));

        // Add initial clue as first message
        messageHistory.unshift({
          id: `${entry.id}-initial`,
          username: game.players[entry.playerId]?.name || "Unknown",
          message: entry.clue,
          timestamp: "Just now",
        });

        const hasConnected = entry.connects.some((c) => c.playerId === userId);

        return {
          id: entry.id,
          type: "signull",
          playerId: entry.playerId,
          username: game.players[entry.playerId]?.name || "Unknown",
          receivedConnects: entry.connects.length, // or correct connects?
          requiredConnects: game.settings.connectsRequired,
          totalActiveGuessers,
          message: entry.clue,
          status: entry.status,
          hasConnected,
          isIntercepted: entry.status === "blocked",
          isInactive: entry.status === "inactive",
          messageHistory,
        };
      })
      .filter((c): c is SignullCardData => c !== null);

    mappedCards.push(...signullCards);

    // Add Waiting card if we are waiting for the next signull
    const flattenedOrder = Object.keys(game.signullState.order)
      .map(Number)
      .sort((a, b) => a - b)
      .reduce(
        (acc, key) => acc.concat(game.signullState.order[String(key)]),
        [] as string[]
      );
    const latestSignullId = flattenedOrder[flattenedOrder.length - 1];
    const latestEntry = latestSignullId
      ? game.signullState.itemsById[latestSignullId]
      : null;
    const isWaitingForNext =
      game.phase === "signulls" &&
      (!latestEntry || latestEntry.status !== "pending");

    if (isWaitingForNext && !isComposingSignull) {
      mappedCards.unshift({ id: "waiting-next", type: "waiting" });
    }

    // 2. Add Composing card if active
    if (isComposingSignull) {
      mappedCards.unshift({
        id: -999,
        type: "send-signull",
      });
    }

    // 3. Add Phase-specific cards at the bottom (end of array)
    // If we are in lobby or setting phase, these should be the only cards or at the bottom
    const playerCount = Object.keys(game.players || {}).length;

    if (game.phase === "lobby") {
      // Don't show waiting card in lobby - lobby page handles this
    } else if (game.phase === "setting") {
      if (game.setterId === userId) {
        mappedCards.push({ id: -2, type: "enter-secret" });
      } else {
        // Only show waiting card if less than 4 players
        if (playerCount < 4) {
          mappedCards.push({ id: -1, type: "waiting" });
        }
      }
    }

    return mappedCards;
  }, [game, userId, isComposingSignull]);

  // Reset active index when cards change significantly?
  // For now, keep it simple.

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

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
      showNotification("Back to reading signulls");
      setIsComposingSignull(false);
      return;
    }

    setIsComposingSignull(true);
    setSignullClue("");
    setSignullWord("");
    setInputValue("");
    setActiveIndex(0); // Jump to the new card (which will be at index 0)
    showNotification("Compose your Signull");
  };

  // Handle submit - validate and transform send-signull card into signull card
  const handleSignullSubmit = async () => {
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

    try {
      await addSignull(signullWord.trim(), signullClue.trim());
      setIsComposingSignull(false);
      setSignullClue("");
      setSignullWord("");
      setInputValue("");
      showNotification(`Signull sent: ${signullWord.trim()}`);
    } catch (error) {
      showNotification("Failed to send Signull");
      console.error(error);
    }
  };

  // Handle response to a SignullCard
  const handleConnect = async () => {
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

    // Check if player is trying to connect to their own signull
    if (currentCard.playerId === userId) {
      showNotification("Can't connect to own signull");
      return;
    }

    try {
      // We need the signull ID. The card ID is the signull ID (as string)
      await submitConnect(inputValue.trim(), currentCard.id as string);
      showNotification(`Response sent to ${currentCard.username}`);
      setInputValue("");
    } catch (error) {
      showNotification("Failed to send response");
      console.error(error);
    }
  };

  // Handle direct guess
  const handleDirectGuessClick = () => {
    setIsDirectGuessMode(true);
  };

  const handleDirectGuessSubmit = async (guess: string) => {
    try {
      await submitDirectGuess(guess);
      showNotification(`Direct guess: ${guess}`);
      setIsDirectGuessMode(false);
    } catch (error) {
      showNotification("Failed to submit guess");
      console.error(error);
    }
  };

  const handleDirectGuessCancel = () => {
    setIsDirectGuessMode(false);
  };

  const handleSecretWordSubmit = async () => {
    if (!inputValue.trim()) return;

    try {
      await setSecretWord(inputValue.trim());
      showNotification(`Secret word set: ${inputValue.trim()}`);
      setInputValue("");
    } catch (error) {
      showNotification("Failed to set secret word");
      console.error(error);
    }
  };

  // Handle history card click
  const handleSignullCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    setIsHistoryOpen(true);
  };

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
    setTimeout(() => setSelectedCardId(null), 300); // Clear after animation
  };

  // Selected card history derived from cards array
  const selectedCardHistory = useMemo(() => {
    if (!selectedCardId) return [];
    const card = cards.find((c) => String(c.id) === selectedCardId);
    if (card && card.type === "signull") {
      return (card as SignullCardData).messageHistory || [];
    }
    return [];
  }, [cards, selectedCardId]);

  // Determine if input should be disabled
  const isInputDisabled = useMemo(() => {
    if (isComposingSignull) return false;

    const currentCard = cards[activeIndex];
    if (!currentCard) return true;

    if (currentCard.type === "signull") {
      const signullCard = currentCard as SignullCardData;

      // If card is not pending, disable input
      if (signullCard.status !== "pending") return true;

      // If user is setter, they can always input (as long as pending)
      if (isSetter) return false;

      // If user is guesser, they can only input if they haven't connected yet
      return signullCard.hasConnected;
    }

    // For other card types (waiting, enter-secret), input is generally disabled
    // unless specific logic handles them (e.g. enter-secret might use a different input mechanism)
    if (currentCard.type === "enter-secret") return false;

    return true;
  }, [cards, activeIndex, isComposingSignull, isSetter]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-200 p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, constrained on desktop */}
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-neutral-100 md:h-[calc(100dvh-2rem)] md:rounded-3xl md:shadow-2xl">
        {/* SECTION 1: Top Header Bar */}
        <header
          ref={headerRef}
          className={`sticky top-0 z-[100] flex h-16 items-center justify-between gap-3 bg-neutral-100 px-4 py-2 transition-all duration-200 ${isDirectGuessMode || isHistoryOpen ? "pointer-events-none opacity-50 blur-sm" : ""}`}
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
              disabled={isDirectGuessMode || isSetter}
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
                        isIntercepted={
                          card.isIntercepted ||
                          card.status === "blocked" ||
                          card.status === "failed"
                        }
                        isInactive={card.isInactive}
                        onClick={() => handleSignullCardClick(String(card.id))}
                        messageHistory={card.messageHistory}
                      />
                    );
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
          onSubmit={
            isComposingSignull
              ? handleSignullSubmit
              : cards[activeIndex]?.type === "enter-secret"
                ? handleSecretWordSubmit
                : handleConnect
          }
          placeholder={
            isComposingSignull
              ? "Enter reference word"
              : cards[activeIndex]?.type === "enter-secret"
                ? "Enter Secret Word"
                : "Enter your response word"
          }
          disableInput={isInputDisabled}
          disableSignull={isSetter}
          disableSubmit={
            isComposingSignull
              ? !signullClue.trim() || !signullWord.trim()
              : !inputValue.trim() || isInputDisabled
          }
          isGameEnded={game?.phase === "ended"}
          onPlayAgain={() => {
            resetGame();
          }}
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
