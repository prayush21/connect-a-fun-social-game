"use client";

/**
 * AudioSettings Component
 *
 * A settings panel for managing sound preferences in the game.
 * Can be used standalone or integrated into the lobby settings.
 */

import React from "react";
import { Volume2, VolumeX, Volume1 } from "lucide-react";
import { useSoundStore } from "@/lib/beta/sound-store";
import { useSound } from "@/lib/beta/useSound";
import type { SoundPreferences } from "@/lib/beta/sound-types";

interface AudioSettingsProps {
  /**
   * Whether to show in compact mode (single toggle)
   */
  compact?: boolean;

  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Full audio settings panel with volume slider and mode selection
 */
export function AudioSettings({
  compact = false,
  className = "",
}: AudioSettingsProps) {
  const { enabled, volume, mode, setEnabled, setVolume, setMode } =
    useSoundStore();
  const { playSound, hasUserInteracted, enableSounds } = useSound();

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);

    // Enable sounds on first interaction
    if (!hasUserInteracted) {
      enableSounds();
    }

    // Play a test sound when enabling
    // if (newEnabled) {
    //   playSound("notification", { force: true });
    // }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleModeChange = (newMode: SoundPreferences["mode"]) => {
    setMode(newMode);

    // Disable enabled if mode is none
    if (newMode === "none") {
      setEnabled(false);
    } else if (!enabled) {
      setEnabled(true);
    }
  };

  const handleTestSound = () => {
    if (!hasUserInteracted) {
      enableSounds();
    }
    playSound("notification", { force: true });
  };

  // Compact mode: just a toggle button
  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className={`flex items-center justify-center rounded-full p-2 transition-all hover:bg-neutral-100 active:scale-95 ${
          enabled ? "bg-white" : "bg-neutral-200"
        } ${className}`}
        title={enabled ? "Sound On" : "Sound Off"}
        aria-label={enabled ? "Turn sound off" : "Turn sound on"}
      >
        {enabled ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </button>
    );
  }

  // Full settings panel
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sound Toggle with Volume Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? (
            volume > 0.5 ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <Volume1 className="h-5 w-5" />
            )
          ) : (
            <VolumeX className="h-5 w-5 text-neutral-400" />
          )}
          <span className="text-sm font-medium">Sound Effects</span>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          className={`relative h-7 w-12 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none ${
            enabled ? "bg-primary" : "bg-neutral-200"
          }`}
          aria-label={enabled ? "Turn sound off" : "Turn sound on"}
        >
          <div
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Volume Slider - Only show when enabled */}
      {enabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="volume-slider" className="text-sm text-neutral-600">
              Volume
            </label>
            <span className="text-sm font-medium">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-primary"
          />
        </div>
      )}

      {/* Sound Mode Selection - Only show when enabled */}
      {enabled && (
        <div className="space-y-2">
          <span className="text-sm text-neutral-600">Notification Level</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleModeChange("all")}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "all"
                  ? "bg-black text-white"
                  : "bg-white hover:bg-neutral-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleModeChange("important")}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "important"
                  ? "bg-black text-white"
                  : "bg-white hover:bg-neutral-100"
              }`}
            >
              Important
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            {mode === "all"
              ? "Play all sound effects"
              : "Only play important sounds (game events, letters revealed)"}
          </p>
        </div>
      )}

      {/* Test Sound Button */}
      {enabled && (
        <button
          onClick={handleTestSound}
          className="w-full rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
        >
          🔊 Test Sound
        </button>
      )}
    </div>
  );
}

/**
 * Compact audio toggle button for header/nav
 */
export function AudioToggleButton({ className = "" }: { className?: string }) {
  return <AudioSettings compact className={className} />;
}

export default AudioSettings;
