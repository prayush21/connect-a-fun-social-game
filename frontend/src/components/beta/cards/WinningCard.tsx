"use client";

/**
 * WinningCard Component
 *
 * Displays a card announcing the winner of the game
 * Features: Title, horizontal divider, and victory message explaining how the game was won
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
}

export function WinningCard({
  winnerRole,
  winCondition,
  secretWord,
  winningPlayerName,
}: WinningCardProps) {
  const title =
    winnerRole === "setter"
      ? "Setter Wins!"
      : winnerRole === "guessers"
        ? "Guessers Win!"
        : "Game Over";

  const getVictoryMessage = (): string => {
    if (winnerRole === "setter") {
      return `The guessers ran out of direct guesses! The secret word was "${secretWord || "???"}".`;
    }

    if (winnerRole === "guessers") {
      if (winCondition === "direct_guess") {
        if (winningPlayerName) {
          return `${winningPlayerName} made a brilliant direct guess: "${secretWord || "???"}"! 🎯`;
        }
        return `A guesser correctly guessed the secret word: "${secretWord || "???"}". 🎯`;
      }

      if (winCondition === "all_letters_revealed") {
        return `The team revealed all letters one by one and uncovered the secret word: "${secretWord || "???"}". 🧩`;
      }

      // Fallback for guessers winning without specific condition
      return `The guessers successfully discovered the secret word: "${secretWord || "???"}".`;
    }

    return "The game has ended.";
  };

  return (
    <div className="flex h-full w-full flex-col bg-white p-6">
      {/* Title */}
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-black">
        {title}
      </h2>

      {/* Horizontal Divider */}
      <div className="mb-4 w-full border-t-2 border-black" />

      {/* Victory Message */}
      <div className="flex flex-1 items-center justify-center">
        <p className="text-center text-sm leading-relaxed text-neutral-700">
          {getVictoryMessage()}
        </p>
      </div>
    </div>
  );
}
