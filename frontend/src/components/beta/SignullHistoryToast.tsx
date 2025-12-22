"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface SignullHistoryItem {
  id: string;
  username: string;
  message: string;
  timestamp?: string;
  /** Whether this connect was correct (matched the signull word) */
  isCorrect?: boolean;
  /** The role of the player who sent this message */
  role?: "setter" | "guesser";
  /** Whether this is the initial clue message from the signull creator */
  isClueGiver?: boolean;
}

interface SignullHistoryToastProps {
  /** History items to display */
  items: SignullHistoryItem[];
  /** Whether the toast stack is visible */
  isVisible: boolean;
  /** Callback to close the toast */
  onClose: () => void;
  /** Maximum number of visible items in stack */
  maxVisible?: number;
  /** Additional class names */
  className?: string;
}

/**
 * SignullHistoryToast Component
 *
 * A Sonner-like stacked toast component for displaying Signull history.
 * Shows history items from the bottom of the screen in a stacked card format.
 *
 * Features:
 * - Stacked card appearance with offset and scale
 * - Smooth enter/exit animations
 * - Expandable on hover/tap to show more items
 * - Click outside to dismiss
 */
export function SignullHistoryToast({
  items,
  isVisible,
  onClose,
  maxVisible = 4,
  className = "",
}: SignullHistoryToastProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Reset expanded state when visibility changes
  React.useEffect(() => {
    if (!isVisible) {
      setIsExpanded(false);
    }
  }, [isVisible]);

  const visibleItems = isExpanded ? items : items.slice(0, maxVisible);
  const hiddenCount = items.length - maxVisible;

  return (
    <AnimatePresence>
      {isVisible && items.length > 0 && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/10"
            onClick={onClose}
          />

          {/* Toast Container */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className={`fixed bottom-0 left-0 right-0 z-[80] mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] ${className}`}
          >
            {/* Header */}
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Signull Log ({items.length})
              </span>
              <button
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Stacked Toast Cards */}
            <div
              className="relative"
              style={{
                height: isExpanded
                  ? `${Math.min(items.length, 8) * 80}px`
                  : `${Math.min(visibleItems.length * 12 + 72, 120)}px`,
                transition: "height 0.3s ease-out",
              }}
              onMouseEnter={() => setIsExpanded(true)}
              onMouseLeave={() => setIsExpanded(false)}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <AnimatePresence mode="popLayout">
                {visibleItems.map((item, index) => {
                  // Stack offset calculations
                  const stackOffset = isExpanded ? index * 76 : index * 8;
                  const scale = isExpanded ? 1 : 1 - index * 0.03;
                  const opacity = isExpanded ? 1 : 1 - index * 0.15;
                  const zIndex = visibleItems.length - index;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      animate={{
                        opacity,
                        y: stackOffset,
                        scale,
                        zIndex,
                      }}
                      exit={{ opacity: 0, y: 50, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        layout: { type: "spring", stiffness: 400, damping: 30 },
                      }}
                      className="absolute left-0 right-0"
                      style={{ zIndex }}
                    >
                      <HistoryToastItem item={item} isFirst={index === 0} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Show more indicator when collapsed */}
              {!isExpanded && hiddenCount > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-0 left-1/2 z-0 -translate-x-1/2 text-xs font-medium text-neutral-500"
                >
                  +{hiddenCount} more
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface HistoryToastItemProps {
  item: SignullHistoryItem;
  isFirst?: boolean;
}

function HistoryToastItem({ item, isFirst }: HistoryToastItemProps) {
  return (
    <div
      className={`rounded-2xl border-2 border-black bg-white px-4 py-3 shadow-lg ${
        isFirst ? "shadow-xl" : ""
      }`}
    >
      {/* Header: Username and Timestamp */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-black">
          {item.username}
        </span>
        {item.timestamp && (
          <span className="text-xs text-neutral-400">{item.timestamp}</span>
        )}
      </div>

      {/* Message */}
      <p className="line-clamp-2 text-sm leading-snug text-black">
        {item.message}
      </p>
    </div>
  );
}

/**
 * Inline toast version for showing current signull's history
 * without a backdrop - designed to appear above the ActionBar
 * Always visible when there's history to show
 * Scrollable when expanded and content exceeds viewport
 */
interface SignullHistoryInlineProps {
  items: SignullHistoryItem[];
  maxVisible?: number;
  /** Maximum height when expanded (in pixels) - defaults to 200 */
  maxExpandedHeight?: number;
  className?: string;
}

export function SignullHistoryInline({
  items,
  maxVisible = 3,
  maxExpandedHeight = 200,
  className = "",
}: SignullHistoryInlineProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const visibleItems = isExpanded ? items : items.slice(0, maxVisible);
  const hiddenCount = isExpanded ? 0 : items.length - maxVisible;

  // Calculate expanded height - use max height if content would exceed it
  const itemHeight = 44; // height per item when expanded
  const expandedContentHeight = items.length * itemHeight;
  const actualExpandedHeight = Math.min(
    expandedContentHeight,
    maxExpandedHeight
  );
  const isScrollable = expandedContentHeight > maxExpandedHeight;

  // Collapsed height calculation
  const collapsedHeight = Math.min(visibleItems.length * 8 + 44, 70);

  return (
    <div
      className={`relative ${className}`}
      style={{
        height: isExpanded
          ? `${actualExpandedHeight + 24}px` // +24 for header
          : `${collapsedHeight}px`,
        transition: "height 0.3s ease-out",
      }}
    >
      {/* Header showing count */}
      {items.length > 1 && (
        <div
          className="mb-1 flex cursor-pointer items-center justify-between px-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Signull Log ({items.length})
          </span>
          <span className="text-[10px] text-neutral-400">
            {isExpanded ? "tap to collapse" : "tap to expand"}
          </span>
        </div>
      )}

      {/* Scrollable container when expanded, stacked when collapsed */}
      {isExpanded ? (
        <div
          ref={scrollContainerRef}
          className="space-y-2 overflow-y-auto pr-1"
          style={{
            maxHeight: `${maxExpandedHeight}px`,
            scrollbarWidth: "thin",
            scrollbarColor: "#d4d4d4 transparent",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item, index) => {
              // Determine if this item should show correct/incorrect styling
              // Only apply to guesser messages that are not the clue giver
              const showConnectResult =
                item.role === "guesser" &&
                !item.isClueGiver &&
                item.isCorrect !== undefined;

              // Inset shadow styles - keep black border, add colored inset shadow
              const correctStyles =
                showConnectResult && item.isCorrect
                  ? "border-green-500 bg-green-50 shadow-[inset_0_0_8px_rgba(34,197,94,0.3)]"
                  : "";
              const incorrectStyles =
                showConnectResult && !item.isCorrect
                  ? "border-red-400 bg-red-50 shadow-[inset_0_0_8px_rgba(239,68,68,0.3)]"
                  : "";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 35,
                    delay: index * 0.02,
                  }}
                  className="w-full"
                >
                  <div
                    className={`mx-auto rounded-xl border-2 border-black bg-white px-3 py-2 ${index === 0 ? "w-full" : "w-1/2"} ${correctStyles} ${incorrectStyles}`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wider text-black">
                        {item.username}
                      </span>
                      <span className="flex-1 truncate text-right text-xs text-neutral-700">
                        {item.message}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Scroll indicator when scrollable */}
          {isScrollable && (
            <div className="pointer-events-none sticky bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-neutral-100 to-transparent" />
          )}
        </div>
      ) : (
        <div
          className="relative"
          style={{
            height: `${Math.min(visibleItems.length * 6 + 36, 54)}px`,
          }}
          onClick={() => setIsExpanded(true)}
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item, index) => {
              const stackOffset = index * 5;
              const scale = 1 - index * 0.015;
              const opacity = 1 - index * 0.15;
              const zIndex = visibleItems.length - index;

              // Determine if this item should show correct/incorrect styling
              // Only apply to guesser messages that are not the clue giver
              const showConnectResult =
                item.role === "guesser" &&
                !item.isClueGiver &&
                item.isCorrect !== undefined;

              // Inset shadow styles - keep black border, add colored inset shadow
              const correctStyles =
                showConnectResult && item.isCorrect
                  ? "shadow-[inset_0_0_10px_rgba(34,197,94,0.3)]"
                  : "";
              const incorrectStyles =
                showConnectResult && !item.isCorrect
                  ? "shadow-[inset_0_0_10px_rgba(239,68,68,0.25)]"
                  : "";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{
                    opacity,
                    y: stackOffset,
                    scale,
                    zIndex,
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 35,
                  }}
                  className="absolute left-0 right-0"
                  style={{ zIndex }}
                >
                  <div
                    className={`mx-auto rounded-xl border-2 border-black bg-white px-3 py-2 ${index === 0 ? "w-full" : "w-1/2"} ${correctStyles} ${incorrectStyles}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-black">
                        {item.username}
                      </span>
                      <span className="line-clamp-1 text-right text-xs text-neutral-700">
                        {item.message}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Show more indicator when collapsed */}
          {hiddenCount > 0 && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-neutral-400">
              +{hiddenCount} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
