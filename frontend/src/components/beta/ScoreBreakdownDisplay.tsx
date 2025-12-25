"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Crown,
  Play,
  Pause,
  TrophyIcon,
  FastForwardIcon,
} from "lucide-react";
import type {
  ScoreEvent,
  Player,
  PlayerId,
  SignullEntry,
  SignullState,
  GameWinner,
  ScoreReason,
} from "@/lib/beta/types";
import { SCORING } from "@/lib/beta/types";
import { Logo } from "../ui/Logo";
import { useSound } from "@/lib/beta/useSound";

// ==================== Configuration ====================

/**
 * Animation timing configuration (in milliseconds)
 * Adjust these values to control the pace of the score counting animation
 */
export const ANIMATION_TIMING = {
  /** Time to display each signull group (now used as delay after all events shown) */
  SIGNULL_DURATION_MS: 3000,
  /** Duration for the row entry animation */
  ROW_ENTRY_DURATION_MS: 500,
  /** Duration for the value swoosh animation */
  SWOOSH_DURATION_MS: 800,
  /** Duration for the score number update animation */
  SCORE_UPDATE_DURATION_MS: 300,
  /** Delay between processing events */
  BETWEEN_EVENTS_DELAY_MS: 200,
};

// ==================== Types ====================

type BreakdownPhase = "signulls" | "direct-guesses" | "game-end" | "complete";

interface SignullBreakdownItem {
  type: "signull";
  signullId: string;
  signull: SignullEntry;
  events: ScoreEvent[];
  clueGiverName: string;
}

interface DirectGuessBreakdownItem {
  type: "direct-guess";
  playerId: PlayerId;
  playerName: string;
  guess: string;
  isCorrect: boolean;
  events: ScoreEvent[];
}

interface GameEndBreakdownItem {
  type: "game-end";
  winner: GameWinner;
  events: ScoreEvent[];
}

type BreakdownItem =
  | SignullBreakdownItem
  | DirectGuessBreakdownItem
  | GameEndBreakdownItem;

interface ScoreBreakdownDisplayProps {
  scoreEvents: ScoreEvent[];
  players: Record<PlayerId, Player>;
  signullState: SignullState;
  winner: GameWinner;
  secretWord: string;
  onComplete: () => void;
}

// ==================== Helper Functions ====================

const getReasonLabel = (reason: ScoreReason): string => {
  switch (reason) {
    case "correct_signull_guess":
      return "Correct Connect";
    case "intercept_signull":
      return "Intercepted!";
    case "signull_resolved":
      return "Signull Resolved";
    case "connect_to_resolved_signull":
      return "Connected to Resolved";
    case "lightning_signull_bonus":
      return "Lightning Signull!";
    case "setter_revealed_letters_bonus":
      return "Revealed Letters Bonus";
    default:
      return "Points";
  }
};

const getReasonIcon = (reason: ScoreReason): string => {
  switch (reason) {
    case "correct_signull_guess":
      return "✓";
    case "intercept_signull":
      return "🛡️";
    case "signull_resolved":
      return "🎯";
    case "connect_to_resolved_signull":
      return "🔗";
    case "lightning_signull_bonus":
      return "⚡";
    case "setter_revealed_letters_bonus":
      return "⭐";
    default:
      return "•";
  }
};

// ==================== Sub-Components ====================

function FlyingScore({
  startRect,
  targetRect,
  value,
  onComplete,
  timing,
}: {
  startRect: DOMRect;
  targetRect: DOMRect;
  value: number;
  onComplete: () => void;
  timing: typeof ANIMATION_TIMING;
}) {
  const isPositive = value > 0;

  return (
    <motion.div
      initial={{
        position: "fixed",
        top: startRect.top,
        left: startRect.right,
        opacity: 1,
        scale: 1,
        pointerEvents: "none",
        zIndex: 100,
      }}
      animate={{
        top: targetRect.top + targetRect.height / 2 - 12, // Center vertically
        left: targetRect.left + targetRect.width - 40, // Aim for the score number area
        opacity: [1, 1, 0],
        scale: [1, 1.2, 0.5],
      }}
      transition={{
        duration: timing.SWOOSH_DURATION_MS / 1000,
        ease: "easeInOut",
      }}
      onAnimationComplete={onComplete}
      className={`text-xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
    >
      {isPositive ? "+" : ""}
      {value}
    </motion.div>
  );
}

function ScoreEventRow({
  event,
  playerName,
  delay = 0,
  rowRef,
  timing,
}: {
  event: ScoreEvent;
  playerName: string;
  delay?: number;
  rowRef?: (el: HTMLDivElement | null) => void;
  timing: typeof ANIMATION_TIMING;
}) {
  const isPositive = event.delta > 0;

  return (
    <motion.div
      ref={rowRef}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay,
        duration: timing.ROW_ENTRY_DURATION_MS / 1000,
      }}
      className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{getReasonIcon(event.reason)}</span>
        <div>
          <span className="font-semibold">{playerName}</span>
          <span className="ml-2 text-sm text-neutral-500">
            {getReasonLabel(event.reason)}
          </span>
        </div>
      </div>
      <motion.span
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.2, type: "spring", stiffness: 500 }}
        className={`text-xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
      >
        {isPositive ? "+" : ""}
        {event.delta}
      </motion.span>
    </motion.div>
  );
}

function SignullBreakdownView({
  item,
  players,
  visibleEventCount,
  onEventRef,
  timing,
}: {
  item: SignullBreakdownItem;
  players: Record<PlayerId, Player>;
  visibleEventCount: number;
  onEventRef: (index: number, el: HTMLDivElement | null) => void;
  timing: typeof ANIMATION_TIMING;
}) {
  const statusLabel =
    item.signull.status === "resolved"
      ? "Resolved"
      : item.signull.status === "blocked"
        ? "Intercepted"
        : item.signull.status;

  const statusColor =
    item.signull.status === "resolved"
      ? "bg-green-100 text-green-700"
      : item.signull.status === "blocked"
        ? "bg-red-100 text-red-700"
        : "bg-neutral-100 text-neutral-700";

  return (
    <div className="space-y-4">
      {/* Signull Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm uppercase tracking-wide text-neutral-500">
            Signull by
          </span>
          <h3 className="text-xl font-bold">{item.clueGiverName}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Clue Display */}
      <div className="rounded-xl border-2 border-black bg-white p-4 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-medium">&ldquo;{item.signull.clue}&rdquo;</p>
        <p className="mt-1 text-sm text-neutral-500">
          Word: <span className="font-bold">{item.signull.word}</span>
        </p>
      </div>

      {/* Score Events */}
      {item.events.length > 0 ? (
        <div className="space-y-2">
          {item.events.slice(0, visibleEventCount).map((event, idx) => (
            <ScoreEventRow
              key={`${event.playerId}-${event.reason}-${idx}`}
              event={event}
              playerName={players[event.playerId]?.name || "Unknown"}
              delay={0}
              rowRef={(el) => onEventRef(idx, el)}
              timing={timing}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-neutral-500">No points awarded</p>
      )}
    </div>
  );
}

function RunningScoreboard({
  players,
  currentScores,
  onPlayerRef,
}: {
  players: Record<PlayerId, Player>;
  currentScores: Record<PlayerId, number>;
  onPlayerRef: (playerId: string, el: HTMLDivElement | null) => void;
}) {
  const sortedPlayers = useMemo(() => {
    return Object.values(players).sort(
      (a, b) => (currentScores[b.id] || 0) - (currentScores[a.id] || 0)
    );
  }, [players, currentScores]);

  return (
    <div className="space-y-1">
      {sortedPlayers.slice(0, 6).map((player, index) => (
        <motion.div
          key={player.id}
          ref={(el) => onPlayerRef(player.id, el as HTMLDivElement | null)}
          layout
          transition={{ duration: 0.5 }}
          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
            index === 0 ? "bg-yellow-100" : "bg-neutral-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-400">
              #{index + 1}
            </span>
            <span className="font-medium">{player.name}</span>
          </div>
          <motion.span
            key={currentScores[player.id]}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="font-bold"
          >
            {currentScores[player.id] || 0}
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
}

// ==================== Main Component ====================

export function ScoreBreakdownDisplay({
  scoreEvents,
  players,
  signullState,
  winner,
  secretWord,
  onComplete,
}: ScoreBreakdownDisplayProps) {
  const { playSound } = useSound();
  const [currentPhase, setCurrentPhase] = useState<BreakdownPhase>("signulls");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(0); // Track event within item
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  // State for swoosh animation
  const [activeSwoosh, setActiveSwoosh] = useState<{
    startRect: DOMRect;
    targetRect: DOMRect;
    value: number;
  } | null>(null);

  // Refs for positions
  const eventRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const playerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [currentScores, setCurrentScores] = useState<Record<PlayerId, number>>(
    () => {
      // Start with base scores (before this round's events)
      const baseScores: Record<PlayerId, number> = {};
      Object.keys(players).forEach((pid) => {
        baseScores[pid] = players[pid].score;
      });
      // Subtract all events from this round to get starting scores
      scoreEvents.forEach((event) => {
        baseScores[event.playerId] =
          (baseScores[event.playerId] || 0) - event.delta;
      });
      return baseScores;
    }
  );

  const animationTiming = useMemo(
    () => ({
      SIGNULL_DURATION_MS:
        ANIMATION_TIMING.SIGNULL_DURATION_MS / speedMultiplier,
      ROW_ENTRY_DURATION_MS:
        ANIMATION_TIMING.ROW_ENTRY_DURATION_MS / speedMultiplier,
      SWOOSH_DURATION_MS: ANIMATION_TIMING.SWOOSH_DURATION_MS / speedMultiplier,
      SCORE_UPDATE_DURATION_MS:
        ANIMATION_TIMING.SCORE_UPDATE_DURATION_MS / speedMultiplier,
      BETWEEN_EVENTS_DELAY_MS:
        ANIMATION_TIMING.BETWEEN_EVENTS_DELAY_MS / speedMultiplier,
    }),
    [speedMultiplier]
  );

  // Build breakdown items from score events
  const breakdownItems = useMemo(() => {
    const items: BreakdownItem[] = [];

    // Group events by signull
    const signullEvents = new Map<string, ScoreEvent[]>();

    scoreEvents.forEach((event) => {
      const signullId = event.details?.signullId as string | undefined;

      if (signullId && signullState.itemsById[signullId]) {
        const existing = signullEvents.get(signullId) || [];
        existing.push(event);
        signullEvents.set(signullId, existing);
      }
    });

    // Add signull items in chronological order
    const sortedSignullIds = Array.from(signullEvents.keys()).sort((a, b) => {
      const signullA = signullState.itemsById[a];
      const signullB = signullState.itemsById[b];
      return (
        new Date(signullA.createdAt).getTime() -
        new Date(signullB.createdAt).getTime()
      );
    });

    sortedSignullIds.forEach((signullId) => {
      const signull = signullState.itemsById[signullId];
      const events = signullEvents.get(signullId) || [];
      items.push({
        type: "signull",
        signullId,
        signull,
        events,
        clueGiverName: players[signull.playerId]?.name || "Unknown",
      });
    });

    return items;
  }, [scoreEvents, signullState, players, winner]);

  // Get current items - only signulls now
  const signullItems = breakdownItems.filter((i) => i.type === "signull");

  // Current display item
  const currentItem = useMemo(() => {
    if (currentPhase === "signulls") {
      return signullItems[currentItemIndex];
    }
    return undefined;
  }, [currentPhase, currentItemIndex, signullItems]);

  // Reset event index when item changes
  useEffect(() => {
    setCurrentEventIndex(0);
    eventRefs.current = {};
  }, [currentItemIndex]);

  // Main Orchestration Effect
  useEffect(() => {
    if (isPaused || currentPhase !== "signulls" || !currentItem) return;

    let cancelled = false;

    const processSequence = async () => {
      // Logic for sequencing within the current item
      if (currentEventIndex < currentItem.events.length) {
        // Step 1: Wait for entry animation of the current row
        // We assume the row is being rendered because `currentEventIndex` allows it (if we passed index + 1)
        // Actually, we render 0 to currentEventIndex inclusive? Or exclusive?
        // Let's say visibleEventCount = currentEventIndex + 1.

        // Wait for row entry
        await new Promise((r) =>
          setTimeout(r, animationTiming.ROW_ENTRY_DURATION_MS)
        );
        if (cancelled) return;

        // Step 2: Trigger Swoosh
        const event = currentItem.events[currentEventIndex];
        const eventEl = eventRefs.current[currentEventIndex];
        const playerEl = playerRefs.current[event.playerId];

        if (eventEl && playerEl) {
          const startRect = eventEl.getBoundingClientRect();
          const targetRect = playerEl.getBoundingClientRect();

          setActiveSwoosh({
            startRect,
            targetRect,
            value: event.delta,
          });
        } else {
          // Fallback if refs missing (e.g. testing) - just update score
          console.warn("Missing refs for animation", { eventEl, playerEl });
        }

        // Wait for swoosh to complete (handled by onComplete callback usually, but here we can wait)
        await new Promise((r) =>
          setTimeout(r, animationTiming.SWOOSH_DURATION_MS)
        );
        if (cancelled) return;

        setActiveSwoosh(null);

        // Step 3: Update Score and Play Sound
        if (
          event.reason === "lightning_signull_bonus" ||
          event.reason === "setter_revealed_letters_bonus"
        ) {
          console.log("Playing extra point sound");
          playSound("extra_game_point");
        } else {
          console.log("Playing standard score point sound");
          playSound("score_point");
        }

        setCurrentScores((prev) => ({
          ...prev,
          [event.playerId]: (prev[event.playerId] || 0) + event.delta,
        }));

        // Wait for score update / reorder
        await new Promise((r) =>
          setTimeout(r, animationTiming.SCORE_UPDATE_DURATION_MS)
        );
        if (cancelled) return;

        // Step 4: Wait between events
        await new Promise((r) =>
          setTimeout(r, animationTiming.BETWEEN_EVENTS_DELAY_MS)
        );
        if (cancelled) return;

        // Advance to next event
        setCurrentEventIndex((prev) => prev + 1);
      } else {
        // All events in this item done. Wait before next item.
        await new Promise((r) =>
          setTimeout(r, animationTiming.SIGNULL_DURATION_MS)
        );
        if (cancelled) return;

        if (currentItemIndex < signullItems.length - 1) {
          setCurrentItemIndex((prev) => prev + 1);
        } else {
          setCurrentPhase("complete");
          onComplete();
        }
      }
    };

    // Only run this if we are "ready" for the next step.
    // This effect runs on mount and when deps change.
    // If we increment currentEventIndex, it runs again for the NEXT event.
    // This forms the loop.
    processSequence();

    return () => {
      cancelled = true;
    };
  }, [
    currentEventIndex,
    currentItem,
    currentItemIndex,
    isPaused,
    signullItems.length,
    currentPhase,
    onComplete,
    playSound, // Added dependency
    animationTiming,
  ]);
  // Handle empty events - skip to complete
  useEffect(() => {
    if (breakdownItems.length === 0) {
      setCurrentPhase("complete");
      onComplete();
    }
  }, [breakdownItems.length, onComplete]);

  // Progress calculation
  const totalItems = signullItems.length;

  if (currentPhase === "complete" || !currentItem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      {/* Swoosh Layer */}
      <AnimatePresence>
        {activeSwoosh && (
          <FlyingScore
            startRect={activeSwoosh.startRect}
            targetRect={activeSwoosh.targetRect}
            value={activeSwoosh.value}
            onComplete={() => {}}
            timing={animationTiming}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrophyIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Score Breakdown</h1>
          </div>
          <Logo />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Breakdown Display */}
          <div className="space-y-2 lg:col-span-2">
            <div className="rounded-3xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentPhase}-${currentItemIndex}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentItem.type === "signull" && (
                    <SignullBreakdownView
                      item={currentItem}
                      players={players}
                      visibleEventCount={currentEventIndex + 1}
                      onEventRef={(idx, el) => {
                        eventRefs.current[idx] = el;
                      }}
                      timing={animationTiming}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Running Scoreboard */}
          <div className="space-y-2 lg:col-span-1">
            {/* Playback Controls */}
            {/* Progress Indicator */}
            <div className="flex items-center gap-4 rounded-2xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {/* <div className="mb-6 flex items-center gap-4 rounded-2xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"> */}
              {/* Pause/Play Button */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center justify-center rounded-lg border-2 border-black bg-primary p-2 transition-transform hover:scale-105 active:scale-95"
                aria-label={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? (
                  <Play className="h-5 w-5 fill-white text-white" />
                ) : (
                  <Pause className="h-5 w-5 text-white" />
                )}
              </button>
              {/* 2x Speed Button */}
              <button
                onClick={() =>
                  setSpeedMultiplier((prev) => (prev === 1 ? 2 : 1))
                }
                className={`flex items-center justify-center gap-1 rounded-lg border-2 border-black p-2 transition-transform hover:scale-105 active:scale-95 ${
                  speedMultiplier === 2 ? "bg-green-500" : "bg-primary"
                }`}
                aria-label="Toggle 2x speed"
              >
                <span className="text-sm font-bold text-white">2x</span>
                <FastForwardIcon className="h-5 w-5 text-white" />
              </button>
              {/* </div> */}
              {/* <span className="text-sm font-medium text-neutral-500">
                Progress: {currentItemIndex + 1} / {signullItems.length}
              </span> */}
              <div className="flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-neutral-200">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((currentItemIndex + 1) / signullItems.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-3 flex items-center gap-2">
                <Crown className="h-5 w-5 text-neutral-500" />
                <h3 className="font-bold">Leaderboard</h3>
              </div>
              <RunningScoreboard
                players={players}
                currentScores={currentScores}
                onPlayerRef={(pid, el) => {
                  playerRefs.current[pid] = el;
                }}
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xl font-bold text-green-600">+5</span>{" "}
              Correct Connect to Resolved Signull
            </div>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xl font-bold text-green-600">+5</span>{" "}
              Intercept
            </div>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xl font-bold text-green-600">+10</span>{" "}
              Signull Resolved
            </div>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xl font-bold text-green-600">+5</span> Bonus
              for Each Letter Revealed/Remaining
            </div>
            {/* <div className="flex items-center gap-2 rounded-2xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-xl font-bold text-green-600">+5</span>{" "}
              Lightning Signull Bonus for Each Hidden Letter to Guesser
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
