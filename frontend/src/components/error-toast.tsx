"use client";

import React from "react";
import type { ErrorToastProps } from "../lib/errors";

export const ErrorToast: React.FC<ErrorToastProps> = ({ error, onDismiss }) => {
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 5000); // Auto-dismiss after 5 seconds
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed right-4 top-4 z-50 w-full max-w-sm rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-red-800">
            Error
          </p>
          <p className="mt-1 text-sm text-red-700">
            {error.message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="inline-flex text-red-400 hover:text-red-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
