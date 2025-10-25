"use client";

import { Player, PlayerId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Trash2, Settings } from "lucide-react";

interface PlayerListProps {
  players: Record<PlayerId, Player>;
  currentPlayerId: PlayerId;
  isRoomCreator: boolean;
  onRemovePlayer: (playerId: PlayerId, playerName: string) => void;
  onEditRoles: () => void;
}

export function PlayerList({
  players,
  currentPlayerId,
  isRoomCreator,
  onRemovePlayer,
  onEditRoles,
}: PlayerListProps) {
  // Convert to entries and sort by name for stable ordering
  const playerEntries = Object.entries(players).sort(([, a], [, b]) => {
    // Primary sort: by name (case-insensitive, locale-aware)
    const nameComparison = (a.name || a.id).localeCompare(
      b.name || b.id,
      undefined,
      {
        sensitivity: "base", // case-insensitive
      }
    );

    // Tiebreaker: by ID for stability when names are identical
    return nameComparison !== 0 ? nameComparison : a.id.localeCompare(b.id);
  });

  return (
    <div className="mb-6">
      {/* Edit Roles Button (only for room creator) */}
      {isRoomCreator && (
        <div className="mb-4 text-center">
          <Button
            variant="secondary"
            onClick={onEditRoles}
            className="bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit Roles
          </Button>
        </div>
      )}

      {/* Players List */}
      <h3 className="mb-2 text-center text-lg font-bold text-slate-900">
        Players ({playerEntries.length}):
      </h3>

      <ul className="space-y-2">
        {playerEntries.map(([playerId, player]) => {
          const isCurrentPlayer = playerId === currentPlayerId;
          const canRemove = isRoomCreator && !isCurrentPlayer;

          return (
            <li
              key={playerId}
              className={`flex items-center justify-between rounded-lg p-3 ${
                isCurrentPlayer ? "bg-indigo-100" : "bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="truncate font-semibold text-slate-900"
                  title={player.name}
                >
                  {player.name}
                  {isCurrentPlayer && (
                    <span className="ml-2 text-sm text-slate-500">(You)</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Remove Player Button */}
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemovePlayer(playerId, player.name)}
                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                    title={`Remove ${player.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {/* Role Badge */}
                <span
                  className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                    player.role === "setter"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {player.role}
                </span>

                {/* Online Status Indicator */}
                <div
                  className={`h-2 w-2 rounded-full ${
                    player.isOnline ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={player.isOnline ? "Online" : "Offline"}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Minimum Players Warning */}
      {playerEntries.length < 3 && (
        <div className="mt-4 rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Need at least 3 players to start the game.</strong>
            <br />
            Share the room code with your friends!
          </p>
        </div>
      )}
    </div>
  );
}
