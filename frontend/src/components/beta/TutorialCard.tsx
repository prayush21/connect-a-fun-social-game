"use client";

import type { CardComponentProps } from "nextstepjs";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

export const TutorialCard = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) => {
  return (
    <div className="relative z-50 min-w-[300px] max-w-sm rounded-xl border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(26,58,109,0.8)]">
      {/* Arrow pointing to element */}
      {arrow}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {step.icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black bg-indigo-100 text-xl">
              {step.icon}
            </div>
          )}
          <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
        </div>

        {step.showSkip && (
          <button
            onClick={skipTour}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close tutorial"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mb-6 text-sm leading-relaxed text-slate-600">
        {step.content}
      </div>

      <div className="flex items-center justify-between border-t-2 border-slate-100 pt-4">
        <div className="text-xs font-semibold text-slate-400">
          Step {currentStep + 1} of {totalSteps}
        </div>

        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={nextStep}
            className="flex h-9 items-center gap-2 rounded-lg border-2 border-black bg-indigo-600 px-4 text-sm font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            {currentStep === totalSteps - 1 ? "Finish" : "Next"}
            {currentStep < totalSteps - 1 && (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
