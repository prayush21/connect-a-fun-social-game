"use client";

import { Player, PlayerId } from "@/lib/beta/types";

/**
 * Player score entry for display
 */
export interface PlayerScoreEntry {
  id: PlayerId;
  name: string;
  score: number;
  isHighestScorer: boolean;
}

export interface ScoresCardProps {
  players: Record<PlayerId, Player>;
}

/**
 * ScoresCard Component
 *
 * Displays player scores in a table format.
 * Highlights the highest scorer with a yellow background.
 * This appears on the back side of the WinningCard when flipped.
 */
export function ScoresCard({ players }: ScoresCardProps) {
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

  const playersWithHighlight: PlayerScoreEntry[] = sortedPlayers.map(
    (player) => ({
      ...player,
      isHighestScorer: player.score === highestScore && highestScore > 0,
    })
  );

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
          playersWithHighlight.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                player.isHighestScorer
                  ? "bg-yellow-200 font-semibold"
                  : "bg-neutral-50"
              }`}
            >
              <span className="truncate text-sm text-black">{player.name}</span>
              <span className="ml-4 text-sm font-medium text-black">
                {player.score}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Tap hint */}
      <p className="mt-4 text-center text-xs text-neutral-400">
        Tap to flip back
      </p>
    </div>
  );
}
