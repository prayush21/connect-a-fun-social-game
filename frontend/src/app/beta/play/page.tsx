"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { BaseCard } from "@/components/beta/cards/BaseCard";
import {
  WaitingCard,
  StartingGameCard,
  EnterSecretWordCard,
  SendASignullCard,
  SignullCard,
  FlippableBaseCard,
  useWinningCardContent,
} from "@/components/beta/cards";
import type { WinCondition, WinningCardProps } from "@/components/beta/cards";
import {
  ActionBar,
  LetterBlocks,
  RoundButton,
  RoundButtonIcon,
  RoomInfoButton,
  NotificationBanner,
  useNotify,
  SignullHistoryInline,
} from "@/components/beta";
import { MemoriesModal } from "@/components/beta/MemoriesModal";
import { useGameNotifications } from "@/lib/beta/useGameNotifications";
import { AnimatePresence, motion } from "framer-motion";
import { useBetaStore } from "@/lib/beta/store";
import {
  useGame,
  useIsSetter,
  getSignullMetrics,
  hasPlayerConnected,
} from "@/lib/beta/selectors";
import type { SignullMetrics } from "@/lib/beta/selectors";
import type { GameWinner, Player, PlayerId } from "@/lib/beta/types";
import { useRouter } from "next/navigation";

// Define card types
type CardType =
  | "waiting"
  | "starting-game"
  | "enter-secret"
  | "send-signull"
  | "signull"
  | "game-ended";

type BaseCardData = {
  id: number | string;
  type: CardType;
};

type WaitingCardData = BaseCardData & {
  type: "waiting";
};

type StartingGameCardData = BaseCardData & {
  type: "starting-game";
};

type EnterSecretCardData = BaseCardData & {
  type: "enter-secret";
};

type SendSignullCardData = BaseCardData & {
  type: "send-signull";
};

type SignullCardData = BaseCardData & {
  type: "signull";
  metrics: SignullMetrics;
  hasConnected: boolean;
  messageHistory?: Array<{
    id: string;
    username: string;
    message: string;
    timestamp?: string;
    isCorrect?: boolean;
    role?: "setter" | "guesser";
    isClueGiver?: boolean;
  }>;
};

type GameEndedCardData = BaseCardData & {
  type: "game-ended";
  winnerRole: GameWinner;
  winCondition?: WinCondition;
  secretWord?: string;
  winningPlayerName?: string;
  players?: Record<PlayerId, Player>;
};

type CardData =
  | WaitingCardData
  | StartingGameCardData
  | EnterSecretCardData
  | SendSignullCardData
  | SignullCardData
  | GameEndedCardData;

/**
 * GameEndedCardWrapper Component
 *
 * Renders the game-ended card with flip animation on the full card (including borders/shadow).
 * Uses FlippableBaseCard for the flip effect.
 */
interface GameEndedCardWrapperProps {
  card: GameEndedCardData;
  isFlipped: boolean;
  onFlip: () => void;
  xOffset: number;
  scale: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  isActive: boolean;
  stackIndex: number;
}

function GameEndedCardWrapper({
  card,
  isFlipped,
  onFlip,
  xOffset,
  scale,
  rotation,
  opacity,
  zIndex,
  isActive,
  stackIndex,
}: GameEndedCardWrapperProps) {
  const winningCardProps: WinningCardProps = {
    winnerRole: card.winnerRole,
    winCondition: card.winCondition,
    secretWord: card.secretWord,
    winningPlayerName: card.winningPlayerName,
    players: card.players,
  };

  const { frontContent, backContent, canFlip } =
    useWinningCardContent(winningCardProps);

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
      <FlippableBaseCard
        frontContent={frontContent}
        backContent={backContent}
        isFlipped={isFlipped}
        onFlip={canFlip ? onFlip : undefined}
        state={isActive ? "active" : "stacked"}
        stackIndex={stackIndex}
      />
    </motion.div>
  );
}

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
  const isSetter = useIsSetter();
  const addSignull = useBetaStore((state) => state.addSignull);
  const submitConnect = useBetaStore((state) => state.submitConnect);
  const submitDirectGuess = useBetaStore((state) => state.submitDirectGuess);
  const setSecretWord = useBetaStore((state) => state.setSecretWord);
  const backToLobby = useBetaStore((state) => state.backToLobby);
  const playAgain = useBetaStore((state) => state.playAgain);
  const changeSetter = useBetaStore((state) => state.changeSetter);

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

  // Reset active index to show winning card when game ends
  useEffect(() => {
    if (game?.phase === "ended") {
      setActiveIndex(0);
    }
  }, [game?.phase]);

  const connectsRequired = game?.settings.connectsRequired || 3;
  const prefixMode = game?.settings.prefixMode || false;
  const directGuessesLeft = game?.directGuessesLeft || 0;

  // Centralized notification system - watches game state for events from other players
  useGameNotifications();
  const notify = useNotify();

  // Local UI state
  const [inputValue, setInputValue] = useState("");
  const [isDirectGuessMode, setIsDirectGuessMode] = useState(false);
  const [isComposingSignull, setIsComposingSignull] = useState(false);
  const [signullClue, setSignullClue] = useState("");
  const [signullWord, setSignullWord] = useState("");
  const [isWinningCardFlipped, setIsWinningCardFlipped] = useState(false);
  const [isMemoriesModalOpen, setIsMemoriesModalOpen] = useState(false);

  // Card stack state
  const [activeIndex, setActiveIndex] = useState(0);

  // Transform game state to cards
  const cards = useMemo<CardData[]>(() => {
    if (!game) return [{ id: -1, type: "waiting" }];

    const mappedCards: CardData[] = [];

    // 1. Add Signull cards (reversed order to show newest first)
    // Use getSignullMetrics for computed values
    const signullCards: SignullCardData[] = Object.keys(game.signullState.order)
      .map(Number)
      .sort((a, b) => a - b)
      .reduce(
        (acc, key) => acc.concat(game.signullState.order[String(key)]),
        [] as string[]
      )
      .reverse()
      .map((signullId): SignullCardData | null => {
        const metrics = getSignullMetrics(game, signullId);
        if (!metrics) return null;

        const entry = game.signullState.itemsById[signullId];
        if (!entry) return null;

        // Map history - all connects (includes setter intercepts)
        // Only show actual guesses for resolved signulls, censor for all other states
        const isResolved = metrics.status === "resolved";

        type HistoryItem = {
          id: string;
          username: string;
          message: string;
          timestamp?: string;
          isCorrect?: boolean;
          role?: "setter" | "guesser";
          isClueGiver?: boolean;
        };

        const messageHistory: HistoryItem[] = metrics.allConnects.map(
          (c, idx) => ({
            id: `${entry.id}-msg-${idx}`,
            username: c.playerName,
            // Show actual guess only if:
            // 1. Player is setter (always show their intercept guesses)
            // 2. Signull is resolved (show all guesser responses)
            message:
              c.playerRole === "setter"
                ? c.guess
                : isResolved
                  ? c.guess
                  : "Connect Sent",
            timestamp: "Just now", // TODO: Format timestamp
            // Only include isCorrect for resolved signulls to trigger styling
            isCorrect: isResolved ? c.isCorrect : undefined,
            role: c.playerRole as "setter" | "guesser",
            isClueGiver: false,
          })
        );

        // Add initial clue as first message
        messageHistory.unshift({
          id: `${entry.id}-initial`,
          username: metrics.clueGiverName,
          message: metrics.clue,
          timestamp: "Just now",
          role: "guesser",
          isClueGiver: true,
        });

        const playerHasConnected = hasPlayerConnected(
          game,
          signullId,
          userId || ""
        );

        return {
          id: entry.id,
          type: "signull",
          metrics,
          hasConnected: playerHasConnected,
          messageHistory,
        };
      })
      .filter((c): c is SignullCardData => c !== null);

    mappedCards.push(...signullCards);

    // Add Waiting card if we are waiting for the next signull
    // Check if all signulls for the current revealedCount are resolved (not pending)
    const currentRoundSignullIds =
      game.signullState.order[String(revealedCount)] || [];
    const hasAnyPendingSignull = currentRoundSignullIds.some((signullId) => {
      const entry = game.signullState.itemsById[signullId];
      return entry?.status === "pending";
    });

    const isWaitingForNext = game.phase === "signulls" && !hasAnyPendingSignull;

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

    if (game.phase === "lobby") {
      // Don't show waiting card in lobby - lobby page handles this
    } else if (game.phase === "setting") {
      if (game.setterId === userId) {
        mappedCards.push({ id: -2, type: "enter-secret" });
      } else {
        // Show starting game card for guessers waiting for setter
        mappedCards.push({ id: -1, type: "starting-game" });
      }
    } else if (game.phase === "ended") {
      // Add winning card at the front when game ends
      // Determine how the game was won
      let winCondition: WinCondition | undefined;
      let winningPlayerName: string | undefined;

      if (game.winner === "setter") {
        // Setter wins when guessers run out of direct guesses
        winCondition = "out_of_guesses";
      } else if (game.winner === "guessers") {
        // Check if all letters were revealed (won by signulls)
        if (game.revealedCount >= game.secretWord.length) {
          winCondition = "all_letters_revealed";
        } else {
          // Won by direct guess (revealed count is less than word length)
          winCondition = "direct_guess";
          // TODO: Track who made the winning guess in game state
          // For now, we don't have this info stored
        }
      }

      mappedCards.unshift({
        id: "game-ended",
        type: "game-ended",
        winnerRole: game.winner,
        winCondition,
        secretWord: game.secretWord,
        winningPlayerName,
        players: game.players,
      });
    }

    return mappedCards;
  }, [game, userId, isComposingSignull, revealedCount]);

  // Reset active index when cards change significantly?
  // For now, keep it simple.

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

  // Notification helper - uses centralized notification system
  const showNotification = (
    message: string,
    type: "info" | "success" | "error" | "signull" = "info"
  ) => {
    notify[type](message);
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
    showNotification("Compose your Signull", "signull");
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
      showNotification("Please enter a clue message", "error");
      return;
    }

    if (!signullWord.trim()) {
      showNotification("Please enter the reference word", "error");
      return;
    }

    try {
      await addSignull(signullWord.trim(), signullClue.trim());
      setIsComposingSignull(false);
      setSignullClue("");
      setSignullWord("");
      setInputValue("");
      showNotification(`Signull sent: ${signullWord.trim()}`, "success");
    } catch (error) {
      showNotification("Failed to send Signull", "error");
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
    if (currentCard.metrics.clueGiverId === userId) {
      showNotification("Can't connect to own signull", "error");
      return;
    }

    // Check if setter is trying to connect when signull word matches secret word
    if (isSetter && currentCard.metrics.word === word) {
      showNotification(
        "Cannot connect to a signull that matches the secret word",
        "error"
      );
      return;
    }

    try {
      // We need the signull ID. The card ID is the signull ID (as string)
      await submitConnect(inputValue.trim(), currentCard.id as string);
      showNotification(
        `Response sent to ${currentCard.metrics.clueGiverName}`,
        "success"
      );
      setInputValue("");
    } catch (error) {
      showNotification("Failed to send response", "error");
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
      showNotification(`Direct guess: ${guess}`, "success");
      setIsDirectGuessMode(false);
    } catch (error) {
      showNotification("Failed to submit guess", "error");
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
      showNotification(`Secret word set: ${inputValue.trim()}`, "success");
      setInputValue("");
    } catch (error) {
      showNotification("Failed to set secret word", "error");
      console.error(error);
    }
  };

  // Current card history - derived from the active card
  const currentCardHistory = useMemo(() => {
    const currentCard = cards[activeIndex];
    if (currentCard && currentCard.type === "signull") {
      return (currentCard as SignullCardData).messageHistory || [];
    }
    return [];
  }, [cards, activeIndex]);

  // Determine if input should be disabled
  const isInputDisabled = useMemo(() => {
    if (isComposingSignull) return false;

    const currentCard = cards[activeIndex];
    if (!currentCard) return true;

    if (currentCard.type === "signull") {
      const signullCard = currentCard as SignullCardData;

      // If card is not pending, disable input
      if (signullCard.metrics.status !== "pending") return true;

      // Disable input if player is trying to connect to their own signull
      if (signullCard.metrics.clueGiverId === userId) return true;

      // If user is setter, they can always input (as long as pending)
      if (isSetter) return false;

      // If user is guesser, they can only input if they haven't connected yet
      return signullCard.hasConnected;
    }

    // For other card types (waiting, enter-secret), input is generally disabled
    // unless specific logic handles them (e.g. enter-secret might use a different input mechanism)
    if (currentCard.type === "enter-secret") return false;

    return true;
  }, [cards, activeIndex, isComposingSignull, isSetter, userId]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-200 p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, constrained on desktop */}
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-neutral-100 md:h-[calc(100dvh-2rem)] md:rounded-3xl md:shadow-2xl">
        {/* SECTION 1: Top Header Bar */}
        <header
          ref={headerRef}
          className="sticky top-0 z-[100] flex h-16 items-center justify-between gap-3 bg-neutral-100 px-4 py-2 transition-all duration-200"
        >
          {/* Room Info Button */}
          <div
            className={`${isDirectGuessMode ? "pointer-events-none opacity-50 blur-sm" : ""}`}
          >
            <RoomInfoButton
              roomCode={roomCode}
              players={players}
              currentPlayerId={userId || undefined}
              connectsRequired={connectsRequired}
              prefixMode={prefixMode}
              canChangeSetter={isSetter && game?.phase === "setting"}
              onChangeSetter={(pid) => {
                void changeSetter(pid);
              }}
            />
          </div>

          {/* SECTION 2: Notification Area - Center aligned in header, stacks vertically */}
          <div className="pointer-events-none absolute inset-x-0 top-14 z-[110] flex justify-center">
            <NotificationBanner maxVisible={4} />
          </div>

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
              disabled={
                isDirectGuessMode || isSetter || game?.phase === "ended"
              }
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

        {/* SECTION 3: Letter Blocks Display */}
        {isWordSet && (
          <div className="px-6 transition-all duration-200">
            <LetterBlocks
              secretWord={word}
              revealedCount={revealedCount}
              isDirectGuessMode={isDirectGuessMode}
              isGameEnded={game?.phase === "ended"}
              onSubmit={handleDirectGuessSubmit}
              onCancel={handleDirectGuessCancel}
              className=""
            />
          </div>
        )}

        {/* SECTION 4: Card Container - Main Game Area */}
        <div
          className={`relative flex-shrink-0 overflow-visible px-6 transition-all duration-300 ${isDirectGuessMode ? "pointer-events-none opacity-50 blur-sm" : ""}`}
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
                  case "starting-game":
                    return <StartingGameCard />;
                  case "enter-secret":
                    return <EnterSecretWordCard />;
                  case "send-signull":
                    return (
                      <SendASignullCard
                        clueMessage={signullClue}
                        onClueChange={setSignullClue}
                        autoFocus={isActive}
                        prefixMode={prefixMode}
                      />
                    );
                  case "signull":
                    return <SignullCard data={card.metrics} />;
                  case "game-ended":
                    // Game ended card is handled separately with FlippableBaseCard
                    return null;
                }
              };

              // Special rendering for game-ended card with FlippableBaseCard
              if (card.type === "game-ended") {
                return (
                  <GameEndedCardWrapper
                    key={card.id}
                    card={card}
                    isFlipped={isWinningCardFlipped}
                    onFlip={() =>
                      setIsWinningCardFlipped(!isWinningCardFlipped)
                    }
                    xOffset={xOffset}
                    scale={scale}
                    rotation={rotation}
                    opacity={opacity}
                    zIndex={zIndex}
                    isActive={isActive}
                    stackIndex={Math.abs(offset)}
                  />
                );
              }

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
                        : card.type === "send-signull"
                          ? "border-2 border-dashed border-draft-border bg-draft-bg/95 shadow-[6px_6px_0px_0px_rgba(115,115,115,0.8)] backdrop-blur-sm"
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
        <div
          className={`${isDirectGuessMode ? "pointer-events-none opacity-50 blur-sm" : ""}`}
        >
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
            disableSignull={isSetter || game?.phase === "setting"}
            disableSubmit={
              isComposingSignull
                ? !signullClue.trim() || !signullWord.trim()
                : !inputValue.trim() || isInputDisabled
            }
            isGameEnded={game?.phase === "ended"}
            onPlayAgain={() => {
              void playAgain();
            }}
            onBackToLobby={() => {
              backToLobby();
            }}
            onMemoriesClick={() => {
              setIsMemoriesModalOpen(true);
            }}
          />
        </div>

        {/* Signull History - Always visible stacked toasts for current signull */}
        {currentCardHistory.length > 0 && (
          <div className="px-4 pb-2">
            <SignullHistoryInline items={currentCardHistory} maxVisible={3} />
          </div>
        )}

        {/* Keyboard Safe Area - Dynamic padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* Memories Modal */}
      {game?.phase === "ended" && (
        <MemoriesModal
          isOpen={isMemoriesModalOpen}
          onClose={() => setIsMemoriesModalOpen(false)}
          secretWord={game.secretWord}
          signullEntries={Object.values(game.signullState.itemsById)}
        />
      )}
    </div>
  );
}
