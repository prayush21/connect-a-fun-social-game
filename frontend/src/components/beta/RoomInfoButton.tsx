"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  role: "setter" | "guesser";
}

interface RoomInfoButtonProps {
  roomCode: string;
  players: Player[];
  connectsRequired: number;
  className?: string;
}

/**
 * RoomInfoButton - Expandable room information component
 *
 * States:
 * 1. Collapsed: Just the icon button
 * 2. Expanded: Shows room code + dropdown arrow
 * 3. Dropdown Open: Shows game settings and player list
 */
export const RoomInfoButton: React.FC<RoomInfoButtonProps> = ({
  roomCode,
  players,
  connectsRequired,
  className,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setIsExpanded(false);
      }
    };

    if (isExpanded || isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, isDropdownOpen]);

  const handleButtonClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    } else {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Main Button - Animated expansion */}
      <motion.button
        onClick={handleButtonClick}
        className={cn(
          "flex items-center justify-center gap-2 rounded-full border-2 border-black bg-white transition-all hover:bg-neutral-50 active:scale-95",
          isExpanded ? "px-3 py-2" : "h-12 w-12"
        )}
        animate={{
          width: isExpanded ? "auto" : "48px",
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Icon - Always visible */}
        <span className="h-6 w-6 flex-shrink-0 text-black">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </span>

        {/* Room Code - Visible when expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
            >
              <span className="text-sm font-bold tracking-wider text-black">
                {roomCode}
              </span>

              {/* Dropdown Arrow */}
              <motion.span
                className="h-4 w-4 flex-shrink-0 text-black"
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 top-full z-[100] mt-2 w-64 rounded-2xl border-2 border-black bg-white shadow-lg"
          >
            {/* Game Settings Section */}
            <div className="border-b-2 border-black p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Connects Required
                </span>
                <span className="text-lg font-bold text-black">
                  {connectsRequired}
                </span>
              </div>
            </div>

            {/* Players List Section */}
            <div className="max-h-64 overflow-y-auto p-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-neutral-50"
                >
                  <span className="text-sm font-medium text-black">
                    {player.name}
                  </span>
                  {player.role === "setter" && (
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      (setter)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
