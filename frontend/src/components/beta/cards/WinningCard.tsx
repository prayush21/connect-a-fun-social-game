"use client";

import { use, useState } from "react";
import { Player, PlayerId } from "@/lib/beta/types";
import { useShowPlayerScores } from "@/lib/posthog";
import { ScoresCard } from "./ScoresCard";
import {
  useLettersRevealed,
  useSignullsGenerated,
  useSignullsIntercepted,
} from "@/lib/beta/selectors";

/**
 * WinningCard Component
 *
 * Displays a card announcing the winner of the game
 * Features: Title, horizontal divider, and victory message explaining how the game was won
 *
 * When the player scores feature flag is enabled, the card becomes flippable.
 * Tapping the card flips it to reveal game stats on the back.
 *
 * Note: This component provides the CONTENT for the card. The actual flip animation
 * is handled by the parent via isFlipped/onFlip props or internally if managing its own state.
 */

export type WinCondition =
  | "direct_guess" // Guesser won by correctly guessing the secret word
  | "all_letters_revealed" // Guessers won by revealing all letters through signulls
  | "out_of_guesses"; // Setter won because guessers ran out of direct guesses

export interface WinningCardProps {
  winnerRole: "setter" | "guessers" | null;
  winCondition?: WinCondition;
  secretWord?: string;
  winningPlayerName?: string; // The player who made the winning direct guess
  players?: Record<PlayerId, Player>; // Players for score display
}

/**
 * Get the front content (player scores) for the WinningCard
 */
export function WinningCardFront({
  players,
  showFlipHint = false,
}: {
  players?: Record<PlayerId, Player>;
  showFlipHint?: boolean;
}) {
  if (!players) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-neutral-500">No scores available</p>
      </div>
    );
  }

  // Convert players record to sorted array (highest score first)
  const sortedPlayers = Object.values(players)
    .map((player) => ({
      id: player.id,
      name: player.name,
      score: player.score,
      isHighestScorer: false,
    }))
    .sort((a, b) => b.score - a.score);

  // Find highest score and mark top scorers
  const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;

  const playersWithHighlight = sortedPlayers.map((player) => ({
    ...player,
    isHighestScorer: player.score === highestScore && highestScore > 0,
  }));

  return (
    <div className="flex h-full w-full flex-col">
      {/* Title */}
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-black">
        Player Scores
      </h2>

      {/* Horizontal Divider */}
      <div className="mb-4 w-full border-t-2 border-black" />

      {/* Scores Table */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {playersWithHighlight.length === 0 ? (
          <p className="text-center text-sm text-neutral-500">
            No players to display
          </p>
        ) : (
          playersWithHighlight.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                player.isHighestScorer
                  ? "bg-yellow-200 font-semibold"
                  : "bg-neutral-50"
              }`}
            >
              <span className="text-sm ">
                <span className="font-bold text-neutral-400">#{index + 1}</span>
                <span className="mx-2 truncate text-black">{player.name}</span>
              </span>
              <span className="ml-4 text-sm font-medium text-black">
                {player.score}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Tap hint */}
      {showFlipHint && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          Tap to see stats
        </p>
      )}
    </div>
  );
}

/**
 * Get the back content (victory message) for the WinningCard
 */
export function WinningCardBack({
  winnerRole,
  winCondition,
  secretWord,
  winningPlayerName,
  showFlipHint = false,
}: WinningCardProps & { showFlipHint?: boolean }) {
  const title = "Guessers Got the word!"; // Default title
  const lettersRevealed = useLettersRevealed();
  const signullsGenerated = useSignullsGenerated();
  const signullsIntercepted = useSignullsIntercepted();

  return (
    <div className="flex h-full w-full flex-col">
      {/* Title */}
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-black">
        {title}
      </h2>

      {/* Horizontal Divider */}
      <div className="mb-4 w-full border-t-2 border-black" />

      {/* Victory Message */}
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-end justify-center gap-8 space-x-6">
          {/* Signulls Generated - Left */}
          <div className="mt-2 flex flex-col items-center">
            <div className="text-3xl font-bold text-neutral-700">
              {signullsGenerated}
            </div>
            <div className="mt-1 text-center text-xs text-neutral-500">
              Signulls
              <br />
              Generated
            </div>
          </div>

          {/* Letters Revealed - Center (podium top) */}
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-neutral-700">
              {lettersRevealed - 1}
            </div>
            <div className="mt-1 text-center text-xs text-neutral-500">
              Letters
              <br />
              Revealed
            </div>
          </div>

          {/* Signulls Intercepted - Right */}
          <div className="mt-2 flex flex-col items-center">
            <div className="text-3xl font-bold text-neutral-700">
              {signullsIntercepted}
            </div>
            <div className="mt-1 text-center text-xs text-neutral-500">
              Signulls
              <br />
              Intercepted
            </div>
          </div>
        </div>
      </div>

      {/* Tap hint */}
      {showFlipHint && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          Tap to see scores
        </p>
      )}
    </div>
  );
}

/**
 * Main WinningCard component - provides content only (no flip animation)
 * Used when the parent handles flipping via FlippableBaseCard
 */
export function WinningCard({
  winnerRole,
  winCondition,
  secretWord,
  winningPlayerName,
  players,
}: WinningCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const showPlayerScores = useShowPlayerScores();

  const canFlip =
    showPlayerScores && players && Object.keys(players).length > 0;

  const handleClick = () => {
    if (canFlip) {
      setIsFlipped(!isFlipped);
    }
  };

  // Simple non-flipping version when feature is disabled
  if (!canFlip) {
    return <WinningCardFront players={players} showFlipHint={false} />;
  }

  // Show the appropriate side based on flip state
  // Note: The actual flip animation is now handled by the parent FlippableBaseCard
  // Front: Player Scores, Back: Game Stats
  if (isFlipped) {
    return (
      <div onClick={handleClick} className="h-full w-full cursor-pointer">
        <WinningCardBack
          winnerRole={winnerRole}
          winCondition={winCondition}
          secretWord={secretWord}
          winningPlayerName={winningPlayerName}
          players={players}
          showFlipHint={true}
        />
      </div>
    );
  }

  return (
    <div onClick={handleClick} className="h-full w-full cursor-pointer">
      <WinningCardFront players={players} showFlipHint={true} />
    </div>
  );
}

/**
 * Props for the flippable winning card that manages its own state
 */
export interface FlippableWinningCardProps extends WinningCardProps {
  /** Controlled flip state (optional - will use internal state if not provided) */
  isFlipped?: boolean;
  /** Callback when flip is triggered */
  onFlip?: () => void;
}

/**
 * Returns the front and back content for use with FlippableBaseCard
 * This allows the parent to handle the flip animation on the full card
 */
export function useWinningCardContent(props: WinningCardProps) {
  const showPlayerScores = useShowPlayerScores();
  const canFlip =
    showPlayerScores && props.players && Object.keys(props.players).length > 0;

  const frontContent = (
    <WinningCardFront players={props.players} showFlipHint={canFlip} />
  );

  const backContent = <WinningCardBack {...props} showFlipHint={canFlip} />;

  return {
    frontContent,
    backContent,
    canFlip,
  };
}
