import { Trash2, Crown, Zap, Pencil, X } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  onEditPlayerName: (id: string, newName: string) => void;
  isHost: boolean; // Can remove players
}

interface EditNameModalProps {
  isOpen: boolean;
  currentName: string;
  currentUserId: string;
  otherPlayerNames: string[];
  onClose: () => void;
  onSave: (newName: string) => void;
}

function EditNameModal({
  isOpen,
  currentName,
  currentUserId,
  otherPlayerNames,
  onClose,
  onSave,
}: EditNameModalProps) {
  const [name, setName] = useState(currentName);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset name when modal opens with new currentName
  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = name.trim();
    if (trimmed) {
      // Check if the name is already taken by another player (case-insensitive)
      const isNameTaken = otherPlayerNames.some(
        (playerName) => playerName.toLowerCase() === trimmed.toLowerCase()
      );
      if (isNameTaken) {
        // Append a random 2-digit number
        const randomNum = Math.floor(Math.random() * 90) + 10; // 10-99
        trimmed = `${trimmed}${randomNum}`;
      }
      onSave(trimmed);
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit Name</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              id="player-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-2 border-neutral-200 px-4 py-2 text-base font-medium transition-all focus:border-primary focus:outline-none"
              maxLength={20}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-neutral-200 px-4 py-2 font-medium text-neutral-600 transition-all hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 rounded-xl border-2 border-black bg-primary px-4 py-2 font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function PlayerList({
  players,
  currentUserId,
  hostId,
  setterId,
  onRemovePlayer,
  onEditPlayerName,
  isHost,
}: PlayerListProps) {
  const showPlayerScores = useShowPlayerScores();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const currentPlayer = players.find((p) => p.id === currentUserId);

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
                <span className="text-start text-lg font-bold">
                  {player.name}
                </span>
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
              {isHost && player.id !== currentUserId && (
                <button
                  onClick={() => onRemovePlayer(player.id)}
                  className="rounded-full border-2 border-transparent p-2 text-neutral-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0)] transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-500 hover:shadow-[2px_2px_0px_0px_rgba(239,68,68,0.3)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(239,68,68,0.3)]"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
              {/* Player score */}
              <span className="text-sm font-medium text-neutral-500">
                {player.score} pts
              </span>
              {/* Edit name button - only for current user */}
              {player.id === currentUserId && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="rounded-full border-2 border-transparent p-2 text-neutral-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0)] transition-all hover:border-primary hover:bg-primary/10 hover:text-primary hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)]"
                  title="Edit your name"
                >
                  <Pencil className="h-4 w-4" />
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

      {/* Edit Name Modal */}
      <EditNameModal
        isOpen={editModalOpen}
        currentName={currentPlayer?.name || ""}
        currentUserId={currentUserId}
        otherPlayerNames={players
          .filter((p) => p.id !== currentUserId)
          .map((p) => p.name)}
        onClose={() => setEditModalOpen(false)}
        onSave={(newName) => onEditPlayerName(currentUserId, newName)}
      />
    </div>
  );
}
