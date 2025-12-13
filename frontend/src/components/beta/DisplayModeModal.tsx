"use client";

import { X, Monitor, Smartphone } from "lucide-react";

interface DisplayModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDisplayMode: (useDisplay: boolean) => void;
  isLoading?: boolean;
}

export function DisplayModeModal({
  isOpen,
  onClose,
  onSelectDisplayMode,
  isLoading = false,
}: DisplayModeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-neutral-100 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-neutral-900">
            Use This Device as Display?
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            A display shows the game board on a shared screen (TV/laptop) while
            players join from their phones.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Display Mode Option */}
          <button
            onClick={() => onSelectDisplayMode(true)}
            disabled={isLoading}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-black bg-primary p-4 text-left text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          >
            <div className="rounded-lg bg-white/20 p-2">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">Yes, use as display</div>
              <div className="text-sm opacity-90">
                Show game board here, players join via QR code
              </div>
            </div>
          </button>

          {/* Regular Player Option */}
          <button
            onClick={() => onSelectDisplayMode(false)}
            disabled={isLoading}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-black bg-white p-4 text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          >
            <div className="rounded-lg bg-neutral-100 p-2">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">No, I&apos;ll play from here</div>
              <div className="text-sm text-neutral-600">
                Join the game as a regular player
              </div>
            </div>
          </button>
        </div>

        {isLoading && (
          <div className="mt-4 text-center text-sm text-neutral-500">
            Creating game...
          </div>
        )}
      </div>
    </div>
  );
}
