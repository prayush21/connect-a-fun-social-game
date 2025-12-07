"use client";

import { motion } from "framer-motion";
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
  className?: string;
  stackIndex?: number; // 0 for active card, 1+ for stacked cards
}

const SPRING_CONFIG = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

/**
 * BaseCard Component
 *
 * Foundational card component with animations.
 * Supports three states: active (top card), stacked (below), and exiting (transitioning out).
 */
export function BaseCard({
  children,
  state = "active",
  className = "",
  stackIndex = 0,
}: BaseCardProps) {
  /**
   * Determine card styling based on state and stack index
   */
  const getCardStyle = () => {
    const baseStyle =
      "relative w-full bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

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
      x: 0,
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

  return (
    <motion.div
      className={`${getCardStyle()} p-6 ${className}`}
      variants={variants}
      initial={state}
      animate={state}
      exit="exiting"
    >
      {children}
    </motion.div>
  );
}
