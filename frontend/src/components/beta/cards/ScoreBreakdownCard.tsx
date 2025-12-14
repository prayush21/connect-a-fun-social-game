"use client";

import { Trophy, Monitor } from "lucide-react";
import { motion } from "framer-motion";

/**
 * ScoreBreakdownCard Component
 *
 * A simple card shown to players during the score counting animation.
 * Displays a message indicating that scores are being counted on the main display.
 *
 * This is shown when:
 * - Game has ended (phase === "ended")
 * - showScoreBreakdown setting is enabled
 * - scoreCountingComplete is false
 * - The game is in display mode (isDisplayMode === true)
 */
export function ScoreBreakdownCard() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center py-8">
      {/* Trophy Icon with Animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="relative">
          <Trophy className="h-16 w-16 text-primary" />
          <motion.div
            className="absolute -right-1 -top-1"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="h-4 w-4 rounded-full border-2 border-black bg-yellow-400" />
          </motion.div>
        </div>
      </motion.div>

      {/* Title */}
      <h2 className="mb-2 text-center text-lg font-bold uppercase tracking-wider text-black">
        Counting Scores
      </h2>

      {/* Horizontal Divider */}
      <div className="mb-6 w-24 border-t-2 border-black" />

      {/* Message */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 text-neutral-600">
          <Monitor className="h-5 w-5" />
          <p className="text-sm leading-relaxed">Watch the main display!</p>
        </div>

        {/* Animated Dots */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-primary"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
