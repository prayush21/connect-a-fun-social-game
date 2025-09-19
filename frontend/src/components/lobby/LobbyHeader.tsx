"use client";

import { useState } from "react";
import { Copy, Info, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoModal } from "@/components/ui/InfoModal";

interface LobbyHeaderProps {
  roomId: string;
  onLeaveRoom: () => void;
}

export function LobbyHeader({ roomId, onLeaveRoom }: LobbyHeaderProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = roomId;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error("Failed to copy room code:", fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <>
      <div className="mb-6 text-center">
        {/* Title and Info Button */}
        <div className="mb-2 flex items-center justify-center gap-2">
          <h1 className="text-4xl font-bold text-slate-900">Game Lobby</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowInfoModal(true)}
            className="text-slate-500 hover:text-slate-700"
            title="How to Play"
          >
            <Info className="h-6 w-6" />
          </Button>
        </div>

        {/* Room Code Section */}
        <div className="mb-4 flex items-center justify-center gap-2 font-mono text-indigo-600">
          <span className="text-sm">Share this game:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyRoomCode}
            className="flex items-center gap-1 bg-slate-100 hover:bg-indigo-100"
            title="Copy Room Code"
          >
            <span className="font-mono font-bold">{roomId}</span>
            <Copy className="h-4 w-4" />
          </Button>
          {copied && <span className="text-sm text-green-600">Copied!</span>}
        </div>

        {/* Leave Room Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onLeaveRoom}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Leave Room
          </Button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}
    </>
  );
}
