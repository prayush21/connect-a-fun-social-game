"use client";

/**
 * AudioSettingsModal Component
 *
 * A modal dialog for managing sound preferences in the game.
 */

import React from "react";
import { X } from "lucide-react";
import { AudioSettings } from "./AudioSettings";

interface AudioSettingsModalProps {
  isHost: boolean;
  isOpen: boolean;
  onClose: () => void;
  displaySoundMode: boolean;
  onToggleDisplaySoundMode: () => void;
}

export function AudioSettingsModal({
  isHost,
  isOpen,
  onClose,
  displaySoundMode,
  onToggleDisplaySoundMode,
}: AudioSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-black p-6">
          <h2 className="text-2xl font-bold">Audio Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-all hover:bg-neutral-100 active:translate-y-[1px]"
            aria-label="Close audio settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <AudioSettings
            isHost={isHost}
            displaySoundMode={displaySoundMode}
            onToggleDisplaySoundMode={onToggleDisplaySoundMode}
          />
        </div>

        {/* Modal Footer */}
        <div className="border-t-2 border-black p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg border-2 border-black bg-black px-4 py-2.5 font-semibold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default AudioSettingsModal;
