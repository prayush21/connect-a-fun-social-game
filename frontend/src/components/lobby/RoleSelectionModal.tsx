"use client";

import { useState } from "react";
import { Player, PlayerId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RoleSelectionModalProps {
  players: Record<PlayerId, Player>;
  currentSetterId: PlayerId;
  onRoleChange: (playerId: PlayerId, newRole: "setter" | "guesser") => void;
  onClose: () => void;
}

export function RoleSelectionModal({
  players,
  currentSetterId,
  onRoleChange,
  onClose,
}: RoleSelectionModalProps) {
  const [selectedSetterId, setSelectedSetterId] = useState(currentSetterId);
  const playerEntries = Object.entries(players);

  const handleSave = () => {
    if (selectedSetterId !== currentSetterId) {
      // Change the current setter to guesser
      onRoleChange(currentSetterId, "guesser");
      // Change the selected player to setter
      onRoleChange(selectedSetterId, "setter");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Select the Word Setter
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Player Selection */}
        <div className="mb-6 space-y-2">
          {playerEntries.map(([playerId, player]) => (
            <label
              key={playerId}
              className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-red-50 ${
                selectedSetterId === playerId
                  ? "bg-red-100"
                  : "bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="selectedSetter"
                value={playerId}
                checked={selectedSetterId === playerId}
                onChange={(e) => setSelectedSetterId(e.target.value)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="font-semibold text-slate-900">
                  {player.name}
                </span>
                {player.role === "setter" && (
                  <span className="ml-2 text-sm text-slate-500">
                    (Current Setter)
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedSetterId}
            className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Save
          </Button>
        </div>

        {/* Help Text */}
        <p className="mt-4 text-center text-sm text-slate-500">
          The Word Setter chooses the secret word and can manage the room
          settings.
        </p>
      </div>
    </div>
  );
}
