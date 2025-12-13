/**
 * useSound Hook
 *
 * A hook for playing sound effects in the game.
 * Handles audio preloading, playback, and respects user preferences.
 *
 * Features:
 * - Lazy loading of audio files
 * - Audio caching for performance
 * - Respects browser autoplay policies
 * - Volume control with category overrides
 * - Error handling and fallbacks
 */

import { useCallback, useEffect, useRef } from "react";
import { useSoundStore } from "./sound-store";
import type { SoundEvent, SoundCategory } from "./sound-types";
import { SOUND_CONFIGS } from "./sound-types";

// Global audio cache to avoid re-creating audio elements
const audioCache = new Map<string, HTMLAudioElement>();

// Track which files failed to load
const failedFiles = new Set<string>();

/**
 * Options for playing a sound
 */
interface PlaySoundOptions {
  /**
   * Override volume for this specific playback (0.0 to 1.0)
   */
  volume?: number;

  /**
   * Force play even if sounds are disabled (use sparingly)
   */
  force?: boolean;

  /**
   * Callback when playback completes
   */
  onComplete?: () => void;

  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
}

/**
 * Get or create an audio element for a sound file
 */
function getAudioElement(soundFile: string): HTMLAudioElement | null {
  // Don't retry failed files
  if (failedFiles.has(soundFile)) {
    return null;
  }

  // Return cached audio element
  if (audioCache.has(soundFile)) {
    return audioCache.get(soundFile)!;
  }

  // Create new audio element
  try {
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.preload = "auto";

    // Mark as failed if loading fails
    audio.addEventListener("error", () => {
      failedFiles.add(soundFile);
      audioCache.delete(soundFile);
      console.warn(`Failed to load sound file: ${soundFile}`);
    });

    audioCache.set(soundFile, audio);
    return audio;
  } catch {
    failedFiles.add(soundFile);
    return null;
  }
}

/**
 * Main useSound hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { play, playSound, preload } = useSound();
 *
 *   // Play a specific sound event
 *   const handleClick = () => {
 *     playSound('button_click');
 *   };
 *
 *   // Play with options
 *   const handleSuccess = () => {
 *     playSound('success', { volume: 0.9 });
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useSound() {
  const {
    enabled,
    volume: masterVolume,
    mode,
    hasUserInteracted,
    markUserInteracted,
    getEffectiveVolume,
    shouldPlaySound,
  } = useSoundStore();

  // Track active audio elements for cleanup
  const activeAudioRef = useRef<Set<HTMLAudioElement>>(new Set());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeAudioRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      activeAudioRef.current.clear();
    };
  }, []);

  /**
   * Preload sound files for faster playback
   */
  const preload = useCallback((events: SoundEvent[]) => {
    events.forEach((event) => {
      const config = SOUND_CONFIGS[event];
      if (config) {
        getAudioElement(config.file);
      }
    });
  }, []);

  /**
   * Play a sound by event name
   */
  const playSound = useCallback(
    async (event: SoundEvent, options?: PlaySoundOptions): Promise<boolean> => {
      const config = SOUND_CONFIGS[event];
      if (!config) {
        console.warn(`Unknown sound event: ${event}`);
        return false;
      }

      // Check if we should play this sound
      if (!options?.force && !shouldPlaySound(config.critical)) {
        return false;
      }

      const audio = getAudioElement(config.file);
      if (!audio) {
        options?.onError?.(
          new Error(`Audio file not available: ${config.file}`)
        );
        return false;
      }

      try {
        // Calculate final volume
        const categoryVolume = getEffectiveVolume(config.category);
        const soundVolume = options?.volume ?? config.defaultVolume;
        audio.volume = Math.max(0, Math.min(1, categoryVolume * soundVolume));

        // Reset to beginning
        audio.currentTime = 0;

        // Track this audio for cleanup
        activeAudioRef.current.add(audio);

        // Play and handle completion
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          await playPromise;
        }

        // Setup completion handler
        const handleEnded = () => {
          activeAudioRef.current.delete(audio);
          audio.removeEventListener("ended", handleEnded);
          options?.onComplete?.();
        };
        audio.addEventListener("ended", handleEnded);

        return true;
      } catch (error) {
        activeAudioRef.current.delete(audio);
        const err =
          error instanceof Error ? error : new Error("Failed to play sound");
        options?.onError?.(err);

        // If autoplay was blocked, we still count it as a valid attempt
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          console.info(
            "Sound playback blocked by autoplay policy. Will work after user interaction."
          );
        }

        return false;
      }
    },
    [getEffectiveVolume, shouldPlaySound]
  );

  /**
   * Play a sound file directly (for custom sounds)
   */
  const playFile = useCallback(
    async (
      file: string,
      options?: PlaySoundOptions & { category?: SoundCategory }
    ): Promise<boolean> => {
      if (!options?.force && !shouldPlaySound(false)) {
        return false;
      }

      const audio = getAudioElement(file);
      if (!audio) {
        options?.onError?.(new Error(`Audio file not available: ${file}`));
        return false;
      }

      try {
        const categoryVolume = getEffectiveVolume(options?.category);
        audio.volume = Math.max(
          0,
          Math.min(1, categoryVolume * (options?.volume ?? 0.7))
        );
        audio.currentTime = 0;

        activeAudioRef.current.add(audio);
        await audio.play();

        const handleEnded = () => {
          activeAudioRef.current.delete(audio);
          audio.removeEventListener("ended", handleEnded);
          options?.onComplete?.();
        };
        audio.addEventListener("ended", handleEnded);

        return true;
      } catch (error) {
        activeAudioRef.current.delete(audio);
        options?.onError?.(
          error instanceof Error ? error : new Error("Failed to play sound")
        );
        return false;
      }
    },
    [getEffectiveVolume, shouldPlaySound]
  );

  /**
   * Stop all currently playing sounds
   */
  const stopAll = useCallback(() => {
    activeAudioRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeAudioRef.current.clear();
  }, []);

  /**
   * Mark that user has interacted (enables sound playback)
   */
  const enableSounds = useCallback(() => {
    markUserInteracted();
  }, [markUserInteracted]);

  return {
    // Core playback functions
    playSound,
    playFile,
    preload,
    stopAll,

    // State
    enabled,
    masterVolume,
    mode,
    hasUserInteracted,

    // Actions
    enableSounds,

    // Helpers
    canPlay: enabled && hasUserInteracted && mode !== "none",
  };
}

/**
 * Hook for a single sound effect (memoized)
 *
 * @example
 * ```tsx
 * function ClickableButton() {
 *   const playClick = useSoundEffect('button_click');
 *   return <button onClick={playClick}>Click</button>;
 * }
 * ```
 */
export function useSoundEffect(event: SoundEvent, options?: PlaySoundOptions) {
  const { playSound } = useSound();

  return useCallback(() => {
    playSound(event, options);
  }, [playSound, event, options]);
}

/**
 * Hook to preload critical sounds on mount
 */
export function usePreloadSounds(events: SoundEvent[]) {
  const { preload } = useSound();

  useEffect(() => {
    preload(events);
  }, [preload, events]);
}

/**
 * Hook to enable sounds on first user interaction
 * Attaches event listeners to document for click/keydown/touch
 */
export function useEnableSoundsOnInteraction() {
  const { hasUserInteracted, enableSounds } = useSound();

  useEffect(() => {
    if (hasUserInteracted) return;

    const handleInteraction = () => {
      enableSounds();
      // Remove listeners after first interaction
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };

    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [hasUserInteracted, enableSounds]);
}
