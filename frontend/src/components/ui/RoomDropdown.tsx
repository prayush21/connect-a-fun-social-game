"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Player } from "@/lib/types";

interface RoomDropdownProps {
  roomId: string;
  players: Record<string, Player>;
  currentPlayerId: string;
  onLeaveRoom: () => void;
  isLeaving: boolean;
}

export function RoomDropdown({
  roomId,
  players,
  currentPlayerId,
  onLeaveRoom,
  isLeaving,
}: RoomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy room code:", err);
    }
  };

  const handleLeaveRoom = () => {
    setIsOpen(false);
    onLeaveRoom();
  };

  const playersList = Object.values(players);
  // const currentPlayer = players[currentPlayerId];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-lg font-semibold transition-colors hover:text-indigo-600"
      >
        <span>Room: {roomId}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Header */}
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Room: {roomId}</h3>
              <Button
                onClick={handleCopyRoomCode}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {copied ? (
                  <>
                    <svg
                      className="mr-1 h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-1 h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Players List */}
          <div className="p-4">
            <h4 className="mb-3 text-sm font-medium text-slate-700">
              Players ({playersList.length})
            </h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {playersList.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-md p-2 ${
                    player.id === currentPlayerId
                      ? "border border-indigo-200 bg-indigo-50"
                      : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        player.isOnline ? "bg-green-500" : "bg-slate-400"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {player.name}
                        </span>
                        {player.id === currentPlayerId && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                            You
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            player.role === "setter"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {player.role === "setter" ? "Word Setter" : "Guesser"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {player.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-200 p-4">
            <Button
              onClick={handleLeaveRoom}
              variant="outline"
              size="sm"
              disabled={isLeaving}
              className="w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              {isLeaving ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Leaving...
                </>
              ) : (
                <>
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Leave Room
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
