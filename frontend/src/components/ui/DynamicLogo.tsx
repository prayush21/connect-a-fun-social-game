"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DynamicLogoProps {
  /** Height of the logo in pixels (default: 40) */
  height?: number;
  /** Font size for the letters (default: 20) */
  fontSize?: number;
  /** Icon size for the lightning (default: 16) */
  iconSize?: number;
  /** Additional className for the wrapper div */
  className?: string;
  /** Whether to animate automatically (default: true) */
  autoAnimate?: boolean;
}

export const DynamicLogo: React.FC<DynamicLogoProps> = ({
  height = 40,
  fontSize = 24,
  iconSize = 22,
  className = "",
  autoAnimate = true,
}) => {
  const [logoState, setLogoState] = useState<
    "collapsed" | "left" | "right" | "full"
  >("full");

  useEffect(() => {
    if (!autoAnimate) return;

    const sequence: Array<"collapsed" | "left" | "right" | "full"> = [
      "full",
      "left",
      "right",
      "collapsed",
    ];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % sequence.length;
      setLogoState(sequence[currentIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, [autoAnimate]);

  const showConnect = logoState === "left" || logoState === "full";
  const showSignull = logoState === "right" || logoState === "full";

  const commonClasses =
    "border-2 border-black bg-white px-1 font-bold text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden";

  // Bouncy spring transition
  const springTransition = {
    type: "spring",
    stiffness: 200,
    damping: 20,
  } as const;

  const getJustification = () => {
    switch (logoState) {
      case "left":
        return "justify-self-end";
      case "right":
        return "justify-self-start";
      default:
        return "justify-self-center";
    }
  };

  // Render a single letter or full text block shared by both ghost and real elements to ensure alignment matches
  const renderBlock = (text: string, isGhost: boolean = false) => (
    <div
      className={`${commonClasses} ${isGhost ? "invisible" : ""}`}
      style={{ fontSize }}
    >
      {text}
    </div>
  );

  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ height }}
    >
      {/* Ghost Element - Forces the container to be the width of the full logo */}
      <div
        className="invisible flex items-center gap-1 opacity-0"
        aria-hidden="true"
        style={{ gridArea: "1/1" }}
      >
        {renderBlock("Connect", true)}
        {renderBlock("L", true)} {/* Placeholder for lightning */}
        {renderBlock("Signull", true)}
      </div>

      {/* Actual Animated Logo */}
      <motion.div
        layout
        className={`flex items-center gap-1 ${getJustification()}`}
        style={{ gridArea: "1/1" }}
        transition={springTransition}
      >
        {/* C - Connect */}
        <motion.div
          layout
          className={commonClasses}
          style={{ fontSize }}
          transition={springTransition}
        >
          <motion.span layout="position">C</motion.span>
          <AnimatePresence mode="wait">
            {showConnect && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{
                  opacity: 0,
                  width: 0,
                  transition: { ...springTransition, delay: 0 },
                }}
                transition={{
                  ...springTransition,
                  opacity: { duration: 0.2 },
                  width: { ...springTransition, delay: 0.15 },
                }}
                className="inline-block overflow-hidden whitespace-nowrap"
              >
                onnect
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Lightning Icon */}
        <motion.div
          layout
          className={commonClasses}
          style={{ fontSize }}
          transition={springTransition}
        >
          <Image
            src="/lightning.svg"
            alt="Lightning"
            width={iconSize}
            height={iconSize}
            className="inline-block"
          />
        </motion.div>

        {/* S - Signull */}
        <motion.div
          layout
          className={commonClasses}
          style={{ fontSize }}
          transition={springTransition}
        >
          <motion.span layout="position">S</motion.span>
          <AnimatePresence mode="wait">
            {showSignull && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{
                  opacity: 0,
                  width: 0,
                  transition: { ...springTransition, delay: 0 },
                }}
                transition={{
                  ...springTransition,
                  opacity: { duration: 0.2 },
                  width: { ...springTransition, delay: 0.15 },
                }}
                className="inline-block overflow-hidden whitespace-nowrap"
              >
                ignull
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};
