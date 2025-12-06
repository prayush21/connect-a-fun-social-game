"use client";

import React from "react";
import type { GameError } from "../lib/types";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // TODO: Log to Sentry in production
    // logErrorToSentry(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;

      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      return (
        <DefaultErrorFallback error={this.state.error} retry={this.retry} />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
interface DefaultErrorFallbackProps {
  error: Error | null;
  retry: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  retry,
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
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

        <h2 className="mb-2 text-center text-lg font-semibold text-gray-900">
          Something went wrong
        </h2>

        <p className="mb-4 text-center text-sm text-gray-600">
          {error?.message ||
            "An unexpected error occurred while playing the game."}
        </p>

        {process.env.NODE_ENV === "development" && error && (
          <details className="mb-4 rounded bg-gray-100 p-3 text-xs">
            <summary className="cursor-pointer font-medium">
              Error Details
            </summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex space-x-3">
          <button
            onClick={retry}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Try Again
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="flex-1 rounded-md bg-gray-600 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-700"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

// Game-specific error fallback
interface GameErrorFallbackProps {
  error: Error;
  retry: () => void;
}

export const GameErrorFallback: React.FC<GameErrorFallbackProps> = ({
  error,
  retry,
}) => {
  const isNetworkError =
    error.message.includes("network") || error.message.includes("offline");
  const isRoomNotFound =
    error.message.includes("room") || error.message.includes("not found");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="text-center">
          {isNetworkError ? (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-6 w-6 text-yellow-600"
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
          ) : (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
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
            </div>
          )}

          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            {isNetworkError
              ? "Connection Problem"
              : isRoomNotFound
                ? "Room Not Found"
                : "Game Error"}
          </h2>

          <p className="mb-6 text-sm text-gray-600">
            {isNetworkError
              ? "Check your internet connection and try again."
              : isRoomNotFound
                ? "This game room doesn't exist or has ended."
                : error.message || "Something went wrong with the game."}
          </p>

          <div className="flex space-x-3">
            {!isRoomNotFound && (
              <button
                onClick={retry}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
              >
                {isNetworkError ? "Reconnect" : "Try Again"}
              </button>
            )}

            <button
              onClick={() => (window.location.href = "/")}
              className="flex-1 rounded-md bg-gray-600 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-700"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for error handling
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: unknown, context?: string) => {
    const gameError: GameError = {
      code: "UNKNOWN_ERROR",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
      details: { context, timestamp: new Date().toISOString() },
    };

    // Log error
    console.error(`Game Error ${context ? `(${context})` : ""}:`, gameError);

    // TODO: Send to analytics/Sentry
    // logErrorToAnalytics(gameError);

    return gameError;
  }, []);

  return { handleError };
};
