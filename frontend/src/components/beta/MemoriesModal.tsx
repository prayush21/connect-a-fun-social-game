"use client";

import { X } from "lucide-react";
import { SignullEntry } from "@/lib/beta/types";

interface MemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretWord: string;
  signullEntries: SignullEntry[];
}

/**
 * MemoriesModal Component
 *
 * Displays a vertical modal showing:
 * - Secret word at the top
 * - List of all resolved signull entries with their revealed count
 */
export function MemoriesModal({
  isOpen,
  onClose,
  secretWord,
  signullEntries,
}: MemoriesModalProps) {
  if (!isOpen) return null;

  // Filter only resolved signull entries
  const resolvedSignulls = signullEntries.filter(
    (entry) => entry.status === "resolved"
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 top-0 z-[70] mx-auto flex h-full max-w-md items-center justify-center p-4">
        <div className="relative max-h-[85vh] w-full overflow-hidden rounded-3xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b-2 border-black bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold uppercase tracking-wider text-black">
                Game Memories
              </h2>
              <button
                onClick={onClose}
                className="rounded-full border-2 border-black bg-neutral-100 p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Secret Word Display */}
            <div className="mt-4 rounded-2xl border-2 border-black bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-neutral-600">
                Secret Word
              </p>
              <p className="text-center font-mono text-2xl font-bold uppercase tracking-widest text-black">
                {secretWord}
              </p>
            </div>
          </div>

          {/* Content - Scrollable list of resolved signulls */}
          <div
            className="overflow-y-auto p-6"
            style={{ maxHeight: "calc(85vh - 200px)" }}
          >
            {resolvedSignulls.length === 0 ? (
              <div className="py-8 text-center text-neutral-500">
                No resolved signulls in this game.
              </div>
            ) : (
              <div className="space-y-3">
                {resolvedSignulls.map((signull, index) => {
                  // Count correct connects for this signull
                  const correctConnects = signull.connects.filter(
                    (c) => c.isCorrect
                  ).length;

                  return (
                    <div
                      key={signull.id}
                      className="rounded-2xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      {/* Signull Number & Word */}
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          Signull #{index + 1}
                        </span>
                        <span className="rounded-full border-2 border-black bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                          Resolved
                        </span>
                      </div>

                      {/* Reference Word */}
                      <div className="mb-3">
                        <p className="font-mono text-xl font-bold uppercase tracking-wider text-black">
                          {signull.word}
                        </p>
                        <p className="mt-1 text-sm italic text-neutral-600">
                          "{signull.clue}"
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between border-t-2 border-neutral-200 pt-2">
                        <span className="text-xs text-neutral-500">
                          Connects: {correctConnects}/{signull.connects.length}
                        </span>
                        {signull.resolvedAt && (
                          <span className="text-xs text-neutral-400">
                            {new Date(signull.resolvedAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
