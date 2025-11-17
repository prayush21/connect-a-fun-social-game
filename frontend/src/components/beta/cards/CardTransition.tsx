"use client";

import { AnimatePresence, motion, Variants } from "framer-motion";
import { ReactNode } from "react";

/**
 * Transition direction for card animations
 */
export type TransitionDirection = "left" | "right" | "up" | "down" | "fade";

/**
 * CardTransition Props
 */
export interface CardTransitionProps {
  children: ReactNode;
  /**
   * Unique key that triggers transition when changed
   */
  transitionKey: string | number;
  /**
   * Direction of entrance animation
   */
  direction?: TransitionDirection;
  /**
   * Custom className for the wrapper
   */
  className?: string;
  /**
   * Disable animations (useful for reduced motion preference)
   */
  disableAnimation?: boolean;
  /**
   * Duration in seconds
   */
  duration?: number;
}

/**
 * Animation variants for different transition directions
 */
const getVariants = (
  direction: TransitionDirection,
  duration: number
): Variants => {
  const baseTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    duration,
  };

  const variants: Record<TransitionDirection, Variants> = {
    left: {
      initial: { x: 300, opacity: 0 },
      animate: { x: 0, opacity: 1, transition: baseTransition },
      exit: { x: -300, opacity: 0, transition: { duration: duration * 0.5 } },
    },
    right: {
      initial: { x: -300, opacity: 0 },
      animate: { x: 0, opacity: 1, transition: baseTransition },
      exit: { x: 300, opacity: 0, transition: { duration: duration * 0.5 } },
    },
    up: {
      initial: { y: 100, opacity: 0, scale: 0.9 },
      animate: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: baseTransition,
      },
      exit: {
        y: -100,
        opacity: 0,
        scale: 0.9,
        transition: { duration: duration * 0.5 },
      },
    },
    down: {
      initial: { y: -100, opacity: 0, scale: 0.9 },
      animate: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: baseTransition,
      },
      exit: {
        y: 100,
        opacity: 0,
        scale: 0.9,
        transition: { duration: duration * 0.5 },
      },
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration } },
      exit: { opacity: 0, transition: { duration: duration * 0.5 } },
    },
  };

  return variants[direction];
};

/**
 * CardTransition Component
 *
 * Animation wrapper using AnimatePresence for smooth card transitions.
 * Handles entrance and exit animations, prevents layout shift during transitions.
 *
 * Usage:
 * ```tsx
 * <CardTransition transitionKey={currentCardId} direction="left">
 *   <YourCardComponent />
 * </CardTransition>
 * ```
 */
export function CardTransition({
  children,
  transitionKey,
  direction = "fade",
  className = "",
  disableAnimation = false,
  duration = 0.3,
}: CardTransitionProps) {
  // If animations disabled (e.g., reduced motion preference)
  if (disableAnimation) {
    return <div className={className}>{children}</div>;
  }

  const variants = getVariants(direction, duration);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`h-full w-full ${className}`}
        // Prevent layout shift by ensuring the wrapper maintains space
        style={{ minHeight: "inherit" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * ReducedMotionWrapper
 *
 * Utility component that detects user's motion preference
 * and automatically disables animations if needed.
 */
export interface ReducedMotionWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ReducedMotionWrapper({
  children,
  fallback,
}: ReducedMotionWrapperProps) {
  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
