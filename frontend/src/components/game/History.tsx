"use client";

import { useEffect, useRef, memo } from "react";
import { Timestamp, FieldValue } from "firebase/firestore";

export interface HistoryEntry {
  id: string;
  message: string;
  timestamp: Date | Timestamp | FieldValue;
  type?: "info" | "success" | "warning" | "error";
  alignment?: "left" | "center" | "right";
  playerId?: string;
}

interface HistoryProps {
  entries: (string | HistoryEntry)[];
  className?: string;
  maxHeight?: string;
  autoScroll?: boolean;
  currentUserId?: string;
}

export const History = memo<HistoryProps>(
  ({
    entries,
    className = "",
    maxHeight = "h-64",
    autoScroll = true,
    currentUserId,
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new entries are added
    useEffect(() => {
      if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [entries, autoScroll]);

    // Convert string entries to HistoryEntry format
    const normalizedEntries: HistoryEntry[] = entries.map((entry, index) => {
      if (typeof entry === "string") {
        return {
          id: `entry-${index}`,
          message: entry,
          timestamp: new Date(),
          type: "info",
          alignment: "center", // Default system messages to center
        };
      }
      return {
        ...entry,
        alignment:
          entry.alignment ||
          (entry.playerId === currentUserId
            ? "right"
            : entry.playerId
              ? "left"
              : "center"),
      };
    });

    // Currently unused but kept for future use
    // const getEntryIcon = (type: HistoryEntry["type"]) => {
    //   switch (type) {
    //     case "success":
    //       return "✅";
    //     case "warning":
    //       return "⚠️";
    //     case "error":
    //       return "❌";
    //     default:
    //       return "ℹ️";
    //   }
    // };

    const getEntryColorClasses = (type: HistoryEntry["type"]) => {
      switch (type) {
        case "success":
          return "text-green-700 bg-green-50 border-green-200";
        case "warning":
          return "text-yellow-700 bg-yellow-50 border-yellow-200";
        case "error":
          return "text-red-700 bg-red-50 border-red-200";
        default:
          return "text-slate-700 bg-slate-50 border-slate-200";
      }
    };

    // Currently unused but kept for future use
    // const formatTimestamp = (timestamp: Date | Timestamp | FieldValue) => {
    //   let date: Date;
    //   if (timestamp instanceof Timestamp) {
    //     date = timestamp.toDate();
    //   } else if (timestamp instanceof Date) {
    //     date = timestamp;
    //   } else {
    //     date = new Date(); // Fallback for FieldValue
    //   }
    //
    //   return date.toLocaleTimeString([], {
    //     hour: "2-digit",
    //     minute: "2-digit",
    //     second: "2-digit",
    //   });
    // };

    if (normalizedEntries.length === 0) {
      return (
        <div className={`${maxHeight} ${className}`}>
          <div className="flex h-full items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="mb-2 text-2xl">📜</div>
              <p className="text-sm">Game history will appear here</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${className}`}>
        <div className="mb-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span className="text-base" aria-hidden="true">
              📜
            </span>
            Game History
          </h3>
        </div>

        <div
          ref={scrollRef}
          className={`
          ${maxHeight} overflow-y-auto
          rounded-lg border border-slate-200
          bg-white shadow-sm
        `}
          role="log"
          aria-label="Game history"
          aria-live="polite"
        >
          <div className="space-y-2 p-3">
            {normalizedEntries.map((entry) => {
              const getAlignmentClasses = () => {
                switch (entry.alignment) {
                  case "right":
                    return "flex justify-end";
                  case "center":
                    return "flex justify-center";
                  default:
                    return "flex justify-start";
                }
              };

              const getMessageClasses = () => {
                switch (entry.alignment) {
                  case "right":
                    return "max-w-[80%] rounded-l-lg rounded-tr-sm";
                  case "center":
                    return "max-w-[90%] rounded-lg";
                  default:
                    return "max-w-[80%] rounded-r-lg rounded-tl-sm";
                }
              };

              return (
                <div key={entry.id} className={getAlignmentClasses()}>
                  <div
                    className={`
                    flex items-start gap-3 border p-2
                    ${getEntryColorClasses(entry.type)}
                    ${getMessageClasses()}
                    transition-colors duration-200
                  `}
                  >
                    {/* <span
                      className="mt-0.5 flex-shrink-0 text-sm"
                      aria-hidden="true"
                    >
                      {getEntryIcon(entry.type)}
                    </span> */}

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm leading-relaxed">
                        {entry.message}
                      </p>
                    </div>

                    {/* <span className="mt-0.5 flex-shrink-0 text-xs text-slate-500">
                      {formatTimestamp(entry.timestamp)}
                    </span> */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scroll to bottom button */}
        {normalizedEntries.length > 5 && (
          <div className="mt-2 text-center">
            <button
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
              className="text-xs text-slate-500 transition-colors hover:text-slate-700"
              title="Scroll to latest"
            >
              ↓ Scroll to latest
            </button>
          </div>
        )}
      </div>
    );
  }
);

History.displayName = "History";
