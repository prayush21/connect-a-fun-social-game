"use client";

import { X } from "lucide-react";
import { Button } from "./button";

interface InfoModalProps {
  onClose: () => void;
}

export function InfoModal({ onClose }: InfoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            How to Play
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Game Instructions */}
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              1
            </div>
            <div className="flex-1">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                Setup <span className="text-xl">🎯</span>
              </h3>
              <p className="text-slate-600">
                One player becomes the Word Setter and chooses a secret word.
                Everyone else becomes Guessers.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              2
            </div>
            <div className="flex-1">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                Give Clues <span className="text-xl">💡</span>
              </h3>
              <p className="text-slate-600">
                Guessers take turns being the Clue Giver. They think of a
                reference word that fits the revealed letters and give a clue.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              3
            </div>
            <div className="flex-1">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                Match & Reveal <span className="text-xl">🔍</span>
              </h3>
              <p className="text-slate-600">
                Other Guessers try to guess the same reference word. If they
                match (and beat the Setter), a new letter is revealed!
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              4
            </div>
            <div className="flex-1">
              <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                Win the Game <span className="text-xl">🏆</span>
              </h3>
              <p className="text-slate-600">
                Guessers win by revealing the full word or making a correct
                direct guess. Setter wins by blocking them!
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={onClose}
            className="bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
}
