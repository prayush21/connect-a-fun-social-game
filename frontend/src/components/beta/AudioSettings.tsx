"use client";

/**
 * AudioSettings Component
 *
 * A settings panel for managing sound preferences in the game.
 * Can be used standalone or integrated into the lobby settings.
 */

import React from "react";
import { Volume2, VolumeX, Volume1, Check } from "lucide-react";
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
  /**
   * Whether the user is the host (for additional settings)
   */
  isHost: boolean;

  /**
   * Whether to display the sound mode toggle (host only)
   */
  displaySoundMode: boolean;

  /**
   * Callback to toggle display sound mode (host only)
   */
  onToggleDisplaySoundMode?: () => void;
}

/**
 * Full audio settings panel with volume slider and mode selection
 */
export function AudioSettings({
  compact = false,
  className = "",
  isHost,
  displaySoundMode,
  onToggleDisplaySoundMode = () => {},
}: AudioSettingsProps) {
  const { enabled, volume, mode, setEnabled, setVolume, setMode } =
    useSoundStore();
  const { playSound, hasUserInteracted, enableSounds } = useSound();

  const handleToggle = () => {
    const newEnabled = !enabled;

    // Play a test sound when enabling
    if (newEnabled) {
      playSound("button_click", { force: true });
    }

    setEnabled(newEnabled);

    // Enable sounds on first interaction
    if (!hasUserInteracted) {
      enableSounds();
    }
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

  console.log({ displaySoundMode });

  // Full settings panel
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Common Display Sound Toggle */}
      {isHost && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Display Sound</span>
          <button
            onClick={() => onToggleDisplaySoundMode()}
            className={`relative h-8 w-14 flex-shrink-0 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none ${
              displaySoundMode ? "bg-primary" : "bg-neutral-200"
            }`}
            aria-label={
              displaySoundMode
                ? "Turn display sound off"
                : "Turn display sound on"
            }
          >
            <div
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                displaySoundMode ? "translate-x-6" : "translate-x-0"
              }`}
            >
              {displaySoundMode && (
                <Check className="m-1 h-3 w-3 text-primary" />
              )}
            </div>
          </button>
        </div>
      )}

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
          className={`relative h-8 w-14 flex-shrink-0 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none ${
            enabled ? "bg-primary" : "bg-neutral-200"
          }`}
          aria-label={enabled ? "Turn sound off" : "Turn sound on"}
        >
          <div
            className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-0"
            }`}
          >
            {enabled && <Check className="m-1 h-3 w-3 text-primary" />}
          </div>
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
      {/* {enabled && (
        <div className="space-y-2">
          <span className="text-sm text-neutral-600">Notification Level</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleModeChange("all")}
              className={`flex-1 rounded-lg border-2 border-black px-3 py-2 text-sm font-medium transition-all ${
                mode === "all"
                  ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white hover:bg-neutral-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleModeChange("important")}
              className={`flex-1 rounded-lg border-2 border-black px-3 py-2 text-sm font-medium transition-all ${
                mode === "important"
                  ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white hover:bg-neutral-50"
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
      )} */}
    </div>
  );
}

/**
 * Compact audio toggle button for header/nav
 */
export function AudioToggleButton({ className = "" }: { className?: string }) {
  return (
    <AudioSettings
      isHost
      compact
      displaySoundMode={true}
      onToggleDisplaySoundMode={() => {}}
      className={className}
    />
  );
}

export default AudioSettings;
