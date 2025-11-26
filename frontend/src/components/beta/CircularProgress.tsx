"use client";

/**
 * CircularProgress Props
 */
export interface CircularProgressProps {
  connectsReceived: number;
  connectsRequired: number;
  isIntercepted?: boolean;
  isInactive?: boolean;
}

/**
 * CircularProgress Component
 *
 * Displays a circular progress indicator showing connects received vs required
 * Used in game cards to show round progress
 */
export function CircularProgress({
  connectsReceived,
  connectsRequired,
  isIntercepted = false,
  isInactive = false,
}: CircularProgressProps) {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Calculate the percentage
  const percentage = (connectsReceived / connectsRequired) * 100;
  const isComplete = percentage >= 100;

  // Calculate the offset (how much of the stroke to hide)
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (isInactive) {
    return (
      <div className="relative h-6 w-6">
        <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-gray-400 bg-gray-100">
          {/* Gray dash/minus mark */}
          <div className="h-0.5 w-3 bg-gray-400" />
        </div>
      </div>
    );
  }

  if (isIntercepted) {
    return (
      <div className="relative h-6 w-6">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-red-500">
          {/* White X mark */}
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="relative h-6 w-6">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-green-500">
          {/* White checkmark */}
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-6 w-6">
      <svg
        className="h-full w-full -rotate-90 transform"
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      >
        {/* Background Circle (Track) */}
        <circle
          className="text-gray-200"
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        {/* Progress Circle (Indicator) */}
        <circle
          className="text-black transition-all duration-500 ease-out"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
    </div>
  );
}
