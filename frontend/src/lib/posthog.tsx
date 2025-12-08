"use client";

import posthog from "posthog-js";
import {
  PostHogProvider as PHProvider,
  useFeatureFlagEnabled,
} from "posthog-js/react";
import { useEffect, ReactNode } from "react";

// Feature flag names as constants
export const FEATURE_FLAGS = {
  SHOW_PLAYER_SCORES: "show-player-scores",
} as const;

// Feature flag variants for A/B testing
export const FEATURE_VARIANTS = {
  SHOW_PLAYER_SCORES: {
    CONTROL: "control", // No scores shown (existing behavior)
    TEST: "test", // Scores card shown on flip
  },
} as const;

/**
 * Check if we should force enable features in development
 * Set NEXT_PUBLIC_FORCE_FEATURE_FLAGS=true in .env.local for local testing
 */
const shouldForceFeatures = (): boolean => {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_FORCE_FEATURE_FLAGS === "true"
  );
};

/**
 * Initialize PostHog client
 * Only initializes in browser environment and when API key is available
 */
function initPostHog() {
  if (typeof window === "undefined") return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  // In development with force flags, we don't need PostHog
  if (!apiKey && !shouldForceFeatures()) {
    console.warn(
      "PostHog API key not configured. Feature flags will be disabled."
    );
    return;
  }

  if (!apiKey) {
    // Force features enabled but no PostHog - that's fine
    console.log(
      "[PostHog] Running with forced feature flags (no PostHog connection)"
    );
    return;
  }

  if (!posthog.__loaded) {
    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: "identified_only",
      capture_pageview: false, // We handle pageviews manually for SPA
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") {
          // Log feature flag values in development
          console.log(
            "[PostHog] Initialized with key:",
            apiKey.slice(0, 10) + "..."
          );
        }
      },
    });
  }
}

interface PostHogProviderProps {
  children: ReactNode;
}

/**
 * PostHog Provider Component
 * Wraps the app to provide PostHog context for feature flags and analytics
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();
  }, []);

  // If PostHog isn't configured, just render children without the provider
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

/**
 * Hook to check if player scores feature is enabled
 * Returns false if PostHog is not configured or feature is disabled
 *
 * For A/B testing:
 * - Returns true for "test" variant (scores shown)
 * - Returns false for "control" variant (no scores)
 * - In development with NEXT_PUBLIC_FORCE_FEATURE_FLAGS=true, always returns true
 */
export function useShowPlayerScores(): boolean {
  const isEnabled = useFeatureFlagEnabled(FEATURE_FLAGS.SHOW_PLAYER_SCORES);

  // In development, allow forcing feature on for testing
  if (shouldForceFeatures()) {
    return true;
  }

  // Return false if undefined (not loaded yet) or explicitly false
  return isEnabled === true;
}

/**
 * Hook to get the variant of the player scores A/B test
 * Useful for analytics and debugging
 */
export function usePlayerScoresVariant(): "control" | "test" | "loading" {
  const isEnabled = useFeatureFlagEnabled(FEATURE_FLAGS.SHOW_PLAYER_SCORES);

  // In development with forced features, always return "test"
  if (shouldForceFeatures()) {
    return "test";
  }

  if (isEnabled === undefined) {
    return "loading";
  }

  return isEnabled ? "test" : "control";
}

/**
 * Hook to identify a user for feature flags
 * Call this when user signs in or when you have user identity
 */
export function useIdentifyUser() {
  return {
    identify: (userId: string, properties?: Record<string, unknown>) => {
      if (typeof window !== "undefined" && posthog.__loaded) {
        posthog.identify(userId, properties);
      }
    },
    reset: () => {
      if (typeof window !== "undefined" && posthog.__loaded) {
        posthog.reset();
      }
    },
  };
}

/**
 * Capture a custom event
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.capture(eventName, properties);
  }
}
