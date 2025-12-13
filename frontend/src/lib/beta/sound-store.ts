/**
 * Sound Store for Beta Game
 *
 * This Zustand store manages sound preferences with localStorage persistence.
 * It provides a centralized way to manage audio settings across the app.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SoundPreferences, SoundCategory } from "./sound-types";
import { DEFAULT_SOUND_PREFERENCES } from "./sound-types";

interface SoundState extends SoundPreferences {
  // Track if user has interacted (for autoplay policies)
  hasUserInteracted: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setMode: (mode: SoundPreferences["mode"]) => void;
  setCategoryVolume: (category: SoundCategory, volume: number) => void;
  resetToDefaults: () => void;
  markUserInteracted: () => void;

  // Computed helpers
  getEffectiveVolume: (category?: SoundCategory) => number;
  shouldPlaySound: (critical?: boolean) => boolean;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      // Initial state from defaults
      ...DEFAULT_SOUND_PREFERENCES,
      hasUserInteracted: false,

      // Actions
      setEnabled: (enabled) => set({ enabled }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      setMode: (mode) => set({ mode }),

      setCategoryVolume: (category, volume) =>
        set((state) => ({
          categoryVolumes: {
            ...state.categoryVolumes,
            [category]: Math.max(0, Math.min(1, volume)),
          },
        })),

      resetToDefaults: () =>
        set({
          ...DEFAULT_SOUND_PREFERENCES,
          hasUserInteracted: get().hasUserInteracted, // Keep interaction state
        }),

      markUserInteracted: () => set({ hasUserInteracted: true }),

      // Computed helpers
      getEffectiveVolume: (category) => {
        const state = get();
        const baseVolume = state.volume;
        const categoryVolume = category
          ? (state.categoryVolumes?.[category] ?? 1)
          : 1;
        return baseVolume * categoryVolume;
      },

      shouldPlaySound: (critical) => {
        const state = get();
        if (!state.enabled || state.mode === "none") return false;
        if (!state.hasUserInteracted) return false;
        if (state.mode === "important" && !critical) return false;
        return true;
      },
    }),
    {
      name: "signull-sound-preferences",
      partialize: (state) => ({
        enabled: state.enabled,
        volume: state.volume,
        mode: state.mode,
        categoryVolumes: state.categoryVolumes,
      }),
    }
  )
);

/**
 * Hook to get just the essential sound settings for UI
 */
export const useSoundSettings = () => {
  return useSoundStore((state) => ({
    enabled: state.enabled,
    volume: state.volume,
    mode: state.mode,
    setEnabled: state.setEnabled,
    setVolume: state.setVolume,
    setMode: state.setMode,
  }));
};

/**
 * Hook to check if sounds can play
 */
export const useCanPlaySound = () => {
  return useSoundStore(
    (state) => state.enabled && state.hasUserInteracted && state.mode !== "none"
  );
};
