"use client";

import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { ReactNode } from "react";

/**
 * Card state props
 */
export type CardState = "active" | "stacked" | "exiting";

/**
 * BaseCard Props
 */
export interface BaseCardProps {
  children: ReactNode;
  state?: CardState;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  disableSwipe?: boolean;
  stackIndex?: number; // 0 for active card, 1+ for stacked cards
}

/**
 * Swipe detection configuration
 */
const SWIPE_THRESHOLD = 50; // Minimum distance in pixels to trigger swipe
const SWIPE_CONFIDENCE_THRESHOLD = 10000; // Velocity * distance threshold
const SPRING_CONFIG = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

/**
 * BaseCard Component
 *
 * Foundational card component with drag/swipe detection and animations.
 * Supports three states: active (top card), stacked (below), and exiting (transitioning out).
 */
export function BaseCard({
  children,
  state = "active",
  onSwipeLeft,
  onSwipeRight,
  className = "",
  disableSwipe = false,
  stackIndex = 0,
}: BaseCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);

  /**
   * Calculate swipe power (distance * velocity)
   */
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  /**
   * Handle drag end - detect swipe direction
   */
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipe = swipePower(info.offset.x, info.velocity.x);

    if (swipe > SWIPE_CONFIDENCE_THRESHOLD) {
      if (info.offset.x > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (info.offset.x < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
  };

  /**
   * Determine card styling based on state and stack index
   */
  const getCardStyle = () => {
    const baseStyle = "relative w-full bg-white rounded-3xl shadow-lg";

    switch (state) {
      case "active":
        return `${baseStyle} z-10`;
      case "stacked":
        return `${baseStyle} z-${Math.max(0, 10 - stackIndex)}`;
      case "exiting":
        return `${baseStyle} z-0`;
      default:
        return baseStyle;
    }
  };

  /**
   * Animation variants for different card states
   */
  const variants = {
    active: {
      scale: 1,
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: SPRING_CONFIG,
    },
    stacked: {
      scale: 1 - stackIndex * 0.05,
      y: stackIndex * 8,
      opacity: 1 - stackIndex * 0.2,
      rotateX: -5,
      transition: SPRING_CONFIG,
    },
    exiting: {
      scale: 0.9,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  /**
   * Drag constraints - only horizontal movement
   */
  const dragConstraints = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  return (
    <motion.div
      className={`${getCardStyle()} p-6 ${className}`}
      style={{
        x: state === "active" ? x : 0,
        opacity: state === "active" ? opacity : variants[state].opacity,
        rotate: state === "active" ? rotate : 0,
      }}
      variants={variants}
      initial={state}
      animate={state}
      exit="exiting"
      drag={state === "active" && !disableSwipe ? "x" : false}
      dragConstraints={dragConstraints}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      {children}
    </motion.div>
  );
}
