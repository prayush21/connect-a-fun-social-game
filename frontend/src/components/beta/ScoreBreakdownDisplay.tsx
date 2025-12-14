"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Target,
  ChevronRight,
  Zap,
  Users,
  Play,
  Pause,
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

// ==================== Configuration ====================

/**
 * Animation timing configuration (in milliseconds)
 * Adjust these values to control the pace of the score counting animation
 */
export const ANIMATION_TIMING = {
  /** Time to display each signull group */
  SIGNULL_DURATION_MS: 10000,
  /** Time to display each direct guess event */
  DIRECT_GUESS_DURATION_MS: 2500,
  /** Time to display game end bonuses */
  GAME_END_DURATION_MS: 10000,
  /** Initial delay before starting the animation */
  INITIAL_DELAY_MS: 1000,
  /** Delay between phases (signulls -> direct guesses -> game end) */
  PHASE_TRANSITION_DELAY_MS: 1500,
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

function ScoreEventRow({
  event,
  playerName,
  delay = 0,
}: {
  event: ScoreEvent;
  playerName: string;
  delay?: number;
}) {
  const isPositive = event.delta > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
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
}: {
  item: SignullBreakdownItem;
  players: Record<PlayerId, Player>;
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
          {item.events.map((event, idx) => (
            <ScoreEventRow
              key={`${event.playerId}-${event.reason}-${idx}`}
              event={event}
              playerName={players[event.playerId]?.name || "Unknown"}
              delay={idx * 0.15}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-neutral-500">No points awarded</p>
      )}
    </div>
  );
}

function DirectGuessBreakdownView({
  item,
  players,
}: {
  item: DirectGuessBreakdownItem;
  players: Record<PlayerId, Player>;
}) {
  return (
    <div className="space-y-4">
      {/* Direct Guess Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm uppercase tracking-wide text-neutral-500">
            Direct Guess
          </span>
          <h3 className="text-xl font-bold">{item.playerName}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            item.isCorrect
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {item.isCorrect ? "Correct!" : "Wrong"}
        </span>
      </div>

      {/* Guess Display */}
      <div className="rounded-xl border-2 border-black bg-white p-4 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-2xl font-bold tracking-wider">{item.guess}</p>
      </div>

      {/* Score Events */}
      {item.events.length > 0 && (
        <div className="space-y-2">
          {item.events.map((event, idx) => (
            <ScoreEventRow
              key={`${event.playerId}-${event.reason}-${idx}`}
              event={event}
              playerName={players[event.playerId]?.name || "Unknown"}
              delay={idx * 0.15}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GameEndBreakdownView({
  item,
  players,
  secretWord,
}: {
  item: GameEndBreakdownItem;
  players: Record<PlayerId, Player>;
  secretWord: string;
}) {
  const winnerLabel =
    item.winner === "guessers" ? "Guessers Win!" : "Setter Wins!";

  return (
    <div className="space-y-4">
      {/* Game End Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Trophy className="mx-auto h-16 w-16 text-yellow-500" />
        </motion.div>
        <h3 className="mt-2 text-2xl font-bold">{winnerLabel}</h3>
        <p className="text-neutral-500">
          The secret word was:{" "}
          <span className="font-bold text-primary">{secretWord}</span>
        </p>
      </div>

      {/* Victory Bonus Events */}
      {item.events.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Victory Bonuses
          </h4>
          {item.events.map((event, idx) => (
            <ScoreEventRow
              key={`${event.playerId}-${event.reason}-${idx}`}
              event={event}
              playerName={players[event.playerId]?.name || "Unknown"}
              delay={idx * 0.1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RunningScoreboard({
  players,
  currentScores,
}: {
  players: Record<PlayerId, Player>;
  currentScores: Record<PlayerId, number>;
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
          layout
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
  const [currentPhase, setCurrentPhase] = useState<BreakdownPhase>("signulls");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(10000); // milliseconds
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

  // Update scores when item changes
  useEffect(() => {
    if (!currentItem) return;

    // Add events from current item to running scores
    const timer = setTimeout(() => {
      setCurrentScores((prev) => {
        const newScores = { ...prev };
        currentItem.events.forEach((event) => {
          newScores[event.playerId] =
            (newScores[event.playerId] || 0) + event.delta;
        });
        return newScores;
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [currentItem]);

  // Auto-advance logic
  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      if (currentPhase === "signulls") {
        if (currentItemIndex < signullItems.length - 1) {
          setCurrentItemIndex((i) => i + 1);
        } else {
          // All signulls shown, complete
          setCurrentPhase("complete");
          onComplete();
        }
      }
    }, animationSpeed);

    return () => clearTimeout(timer);
  }, [
    currentPhase,
    currentItemIndex,
    signullItems.length,
    onComplete,
    isPaused,
    animationSpeed,
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
  const currentProgress = currentItemIndex + 1;

  if (currentPhase === "complete" || !currentItem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Score Breakdown</h1>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Breakdown Display */}
          <div className="lg:col-span-2">
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
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress Indicator */}
            <div className="mt-6 flex items-center gap-4 rounded-2xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-sm font-medium text-neutral-500">
                Progress: {currentItemIndex + 1} / {signullItems.length}
              </span>
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
          </div>

          {/* Right: Running Scoreboard */}
          <div className="lg:col-span-1">
            {/* Playback Controls */}
            <div className="mb-6 flex items-center gap-4 rounded-2xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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

              {/* Speed Slider */}
              <div className="flex flex-1 items-center gap-3">
                <span className="text-sm font-medium text-neutral-600">
                  Speed:
                </span>
                <input
                  type="range"
                  min="2000"
                  max="5000"
                  step="500"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                  className="flex-1 accent-primary"
                  aria-label="Animation speed"
                />
                <span className="text-sm font-medium text-neutral-600">
                  {(animationSpeed / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-neutral-500" />
                <h3 className="font-bold">Live Scores</h3>
              </div>
              <RunningScoreboard
                players={players}
                currentScores={currentScores}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
