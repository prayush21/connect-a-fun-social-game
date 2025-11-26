"use client";

/**
 * WinningCard Component
 *
 * Displays a card announcing the winner of the game
 * Features: Title, horizontal divider, and victory message
 */
export interface WinningCardProps {
  winnerRole: "setter" | "guessers" | null;
}

export function WinningCard({ winnerRole }: WinningCardProps) {
  const title =
    winnerRole === "setter"
      ? "Setter Wins!"
      : winnerRole === "guessers"
        ? "Guessers Win!"
        : "Game Over";

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
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non
          risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec,
          ultricies sed, dolor.
        </p>
      </div>
    </div>
  );
}
