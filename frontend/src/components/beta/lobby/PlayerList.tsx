import { Trash2, Crown, Zap } from "lucide-react";
import { BaseCard } from "@/components/beta/cards/BaseCard";
import { useShowPlayerScores } from "@/lib/posthog";

interface Player {
  id: string;
  name: string;
  role?: string;
  score?: number;
}

interface PlayerListProps {
  players: Player[];
  currentUserId: string;
  hostId: string; // The host who controls settings
  setterId: string; // The current setter
  onRemovePlayer: (id: string) => void;
  isHost: boolean; // Can remove players
}

export function PlayerList({
  players,
  currentUserId,
  hostId,
  setterId,
  onRemovePlayer,
  isHost,
}: PlayerListProps) {
  const showPlayerScores = useShowPlayerScores();

  return (
    <div className="w-full space-y-3">
      {players.map((player) => {
        const isPlayerHost = player.id === hostId;
        const isPlayerSetter = player.id === setterId;

        return (
          <BaseCard
            key={player.id}
            className={`flex items-center justify-between !rounded-2xl !p-4 transition-all ${
              player.id === currentUserId
                ? "z-10 border-2 border-black shadow-md"
                : "border-2 border-transparent shadow-sm hover:border-neutral-100"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm ${
                  isPlayerSetter
                    ? "border-primary bg-primary text-white"
                    : "border-neutral-100 bg-neutral-100"
                }`}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold">{player.name}</span>
                <div className="flex items-center gap-2">
                  {isPlayerHost && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                      <Crown className="h-3 w-3" />
                      Host
                    </span>
                  )}
                  {isPlayerSetter && (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Zap className="h-3 w-3" />
                      Setter
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Player score - shown when feature flag is enabled */}
              {showPlayerScores && player.score !== undefined && (
                <span className="text-sm font-medium text-neutral-500">
                  {player.score} pts
                </span>
              )}
              {isHost && player.id !== currentUserId && (
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="rounded-full border-2 border-transparent p-2 text-neutral-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0)] transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-500 hover:shadow-[2px_2px_0px_0px_rgba(239,68,68,0.3)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(239,68,68,0.3)]"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </BaseCard>
        );
      })}

      {/* Waiting placeholder - only show when less than 5 players */}
      {players.length < 5 && (
        <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/50 p-6 text-center text-neutral-400">
          Waiting for player...
        </div>
      )}
    </div>
  );
}
