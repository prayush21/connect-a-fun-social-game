"use client";

import { memo } from "react";
import type { Reference } from "@/lib/types";

interface ViewReferenceProps {
  reference: Reference;
  revealedPrefix: string;
  className?: string;
}

export const ViewReference = memo<ViewReferenceProps>(
  ({ reference, revealedPrefix, className = "" }) => {
    // Create display for reference word with revealed prefix and fixed underscores
    // const createReferenceDisplay = (prefix: string) => {
    //   const prefixUpper = prefix.toUpperCase();
    //   // Always show 3-4 underscores regardless of actual word length
    //   const underscores = "____";

    //   return prefixUpper + underscores;
    // };

    // const referenceDisplay = createReferenceDisplay(revealedPrefix);

    return (
      <div
        className={`space-y-4 ${className}`}
        role="region"
        aria-label="Reference clue"
      >
        {/* Reference Title */}
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold text-slate-800">
            Reference
          </h3>
        </div>

        {/* Clue Text */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-center leading-relaxed text-slate-700">
            {reference.clue}
          </p>
        </div>

        {/* Reference Word Display */}
        {/* <div className="text-center">
          <div className="inline-block rounded-lg bg-slate-100 px-4 py-2">
            <span className="font-mono text-lg font-bold tracking-wider text-slate-700">
              {referenceDisplay}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Reference word shares the same prefix:{" "}
            {revealedPrefix.toUpperCase()}
          </p>
        </div> */}

        {/* Climactic Indicator */}
        {reference.isClimactic && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-center text-sm font-medium text-yellow-800">
              🎯 This is the Final round! The reference word matches the secret
              word!
            </p>
          </div>
        )}

        {/* Screen reader information */}
        <div className="sr-only">
          Reference clue: {reference.clue}. Reference word starts with{" "}
          {revealedPrefix}.
          {reference.isClimactic && " This is a climactic round."}
        </div>
      </div>
    );
  }
);

ViewReference.displayName = "ViewReference";
