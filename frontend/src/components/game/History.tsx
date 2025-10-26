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
    currentUserId: _currentUserId,
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
          alignment: "left",
        };
      }
      return {
        ...entry,
        alignment: "left", // All entries left-aligned like terminal
      };
    });

    const getMessageColor = (type: HistoryEntry["type"]) => {
      switch (type) {
        case "success":
          return "text-green-300";
        case "warning":
          return "text-yellow-300";
        case "error":
          return "text-red-300";
        default:
          return "text-slate-300";
      }
    };

    if (normalizedEntries.length === 0) {
      return (
        <div className={`${maxHeight} ${className}`}>
          <div className="flex h-full items-center justify-center">
            <div className="font-mono text-sm text-slate-500">
              <div className="mb-2 text-center">$ waiting for logs...</div>
              <div className="text-center text-xs opacity-60">
                Game history will appear here
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${className}`}>
        {/* Terminal Header */}
        <div className="mb-2 rounded-t-lg border border-b-0 border-slate-700 bg-slate-800 px-4 py-2">
          <span className="font-mono text-sm text-slate-400">
            game-session.log
          </span>
        </div>

        {/* Terminal Body */}
        <div
          ref={scrollRef}
          className={`
          ${maxHeight} overflow-y-auto
          border border-slate-700 bg-slate-950
          font-mono text-sm
        `}
          role="log"
          aria-label="Game history"
          aria-live="polite"
        >
          <div className="p-4 space-y-1">
            {normalizedEntries.map((entry, index) => {
              const messageColor = getMessageColor(entry.type);
              
              return (
                <div
                  key={entry.id}
                  className="group flex items-start gap-3 hover:bg-slate-900/50 px-2 py-1 rounded transition-colors"
                  style={{ 
                    animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  {/* Dash prefix */}
                  <span className="text-slate-500 flex-shrink-0 select-none mt-0.5">
                    -
                  </span>

                  {/* Message */}
                  <span className={`${messageColor} flex-1 break-words leading-relaxed`}>
                    {entry.message}
                  </span>
                </div>
              );
            })}
            
            {/* Cursor blink effect */}
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="text-slate-500 text-xs">$</span>
              <span className="inline-block h-4 w-2 bg-green-400 animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* Terminal Footer with controls */}
        <div className="flex items-center justify-between rounded-b-lg border border-t-0 border-slate-700 bg-slate-800 px-3 py-1.5">
          <span className="font-mono text-xs text-slate-500">
            {normalizedEntries.length} {normalizedEntries.length === 1 ? 'entry' : 'entries'}
          </span>
          
          {normalizedEntries.length > 5 && (
            <button
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
              className="font-mono text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
              title="Scroll to latest"
            >
              <span>↓</span>
              <span>scroll to bottom</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

History.displayName = "History";
