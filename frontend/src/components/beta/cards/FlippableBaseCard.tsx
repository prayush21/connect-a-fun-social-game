"use client";

import { motion } from "framer-motion";
import { ReactNode, useState } from "react";
import type { CardState } from "./BaseCard";

/**
 * FlippableBaseCard Props
 */
export interface FlippableBaseCardProps {
  /** Content for the front side of the card */
  frontContent: ReactNode;
  /** Content for the back side of the card */
  backContent: ReactNode;
  /** Whether the card is currently flipped */
  isFlipped?: boolean;
  /** Callback when the card is clicked to flip */
  onFlip?: () => void;
  /** Card state for animations */
  state?: CardState;
  /** Additional class names */
  className?: string;
  /** Stack index for stacked card effects */
  stackIndex?: number;
}

const SPRING_CONFIG = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

/**
 * FlippableBaseCard Component
 *
 * A BaseCard that can flip to reveal content on the back side.
 * Both front and back have the full card styling (border, shadow, rounded corners).
 */
export function FlippableBaseCard({
  frontContent,
  backContent,
  isFlipped = false,
  onFlip,
  state = "active",
  className = "",
  stackIndex = 0,
}: FlippableBaseCardProps) {
  /**
   * Determine card styling based on state and stack index
   */
  const getCardStyle = () => {
    const baseStyle =
      "absolute inset-0 w-full h-full bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] [backface-visibility:hidden]";

    switch (state) {
      case "active":
        return `${baseStyle}`;
      case "stacked":
        return `${baseStyle}`;
      case "exiting":
        return `${baseStyle}`;
      default:
        return baseStyle;
    }
  };

  /**
   * Animation variants for different card states
   */
  const containerVariants = {
    active: {
      scale: 1,
      y: 0,
      x: 0,
      opacity: 1,
      transition: SPRING_CONFIG,
    },
    stacked: {
      scale: 1 - stackIndex * 0.05,
      y: stackIndex * 8,
      opacity: 1 - stackIndex * 0.2,
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
      className={`relative w-full cursor-pointer [perspective:1000px] ${className}`}
      style={{ aspectRatio: "3 / 2" }}
      variants={containerVariants}
      initial={state}
      animate={state}
      exit="exiting"
      onClick={onFlip}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Front side - full card with styling */}
        <div className={getCardStyle()}>
          <div className="h-full w-full p-6">{frontContent}</div>
        </div>

        {/* Back side - full card with styling, rotated 180deg */}
        <div className={`${getCardStyle()} [transform:rotateY(180deg)]`}>
          <div className="h-full w-full p-6">{backContent}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Hook to manage flip state for FlippableBaseCard
 */
export function useFlipCard(initialFlipped = false) {
  const [isFlipped, setIsFlipped] = useState(initialFlipped);

  const flip = () => setIsFlipped((prev) => !prev);
  const flipTo = (flipped: boolean) => setIsFlipped(flipped);
  const reset = () => setIsFlipped(false);

  return { isFlipped, flip, flipTo, reset };
}
