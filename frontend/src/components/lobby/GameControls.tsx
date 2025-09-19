"use client";

import { Button } from "@/components/ui/button";
import { Play, Users } from "lucide-react";

interface GameControlsProps {
  canStartGame: boolean;
  isRoomCreator: boolean;
  playerCount: number;
  onStartGame: () => void;
}

export function GameControls({
  canStartGame,
  isRoomCreator,
  playerCount,
  onStartGame,
}: GameControlsProps) {
  const minPlayersNeeded = Math.max(0, 3 - playerCount);

  return (
    <div className="text-center">
      {isRoomCreator ? (
        canStartGame ? (
          <Button
            onClick={onStartGame}
            size="lg"
            className="bg-green-600 px-8 py-3 text-lg font-semibold text-white hover:bg-green-700"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Game
          </Button>
        ) : (
          <div className="space-y-3">
            {/* Start Game Button (disabled) */}
            <Button
              disabled
              size="lg"
              className="px-8 py-3 text-lg font-semibold"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Game
            </Button>

            {/* Status Messages */}
            {playerCount < 3 ? (
              <div className="rounded-lg bg-yellow-50 p-4">
                <div className="flex items-center justify-center gap-2 text-yellow-800">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">
                    Need {minPlayersNeeded} more player
                    {minPlayersNeeded !== 1 ? "s" : ""} to start
                  </span>
                </div>
                <p className="mt-2 text-sm text-yellow-700">
                  Share the room code with your friends to get started!
                </p>
              </div>
            ) : (
              <p className="text-slate-500">
                Ready to start! Click the button above when everyone is ready.
              </p>
            )}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <p className="text-slate-500">
            Waiting for the Word Setter to start the game...
          </p>
        </div>
      )}

      {/* Game Rules Reminder */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4 text-left">
        <h4 className="mb-2 font-semibold text-blue-900">Quick Reminder:</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• The Word Setter chooses a secret word (5-12 letters)</li>
          <li>• Guessers work together to reveal letters and guess the word</li>
          <li>• Use references and clues to unlock letters</li>
          <li>• Guessers get 3 direct guesses to win</li>
        </ul>
      </div>
    </div>
  );
}
