"use client";

import type { GameInsight, Player, PlayerId } from "@/lib/beta/types";
import { InsightCard } from "./InsightCard";

interface GameInsightsProps {
  insights: GameInsight[];
  players: Record<PlayerId, Player>;
}

export function GameInsights({ insights, players }: GameInsightsProps) {
  // No insights to show
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    // <div className="rounded-3xl border-2 border-black bg-white p-6 shadow-neobrutalist">
    <div className="flex flex-col gap-4 md:flex-row">
      {insights.slice(0, 2).map((insight) => (
        <InsightCard key={insight.id} insight={insight} players={players} />
      ))}
    </div>
    // </div>
  );
}
