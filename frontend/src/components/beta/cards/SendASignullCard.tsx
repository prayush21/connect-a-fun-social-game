"use client";

/**
 * SendASignullCard Component
 *
 * Displays a card prompting the user to send a signull message
 * Features: Title, horizontal divider, editable text area, and down arrow
 */
export interface SendASignullCardProps {
  /** The clue message being composed */
  clueMessage: string;
  /** Callback when clue message changes */
  onClueChange: (message: string) => void;
  /** Optional auto-focus on the textarea */
  autoFocus?: boolean;
  /** Whether prefix mode is enabled */
  prefixMode: boolean;
}

export function SendASignullCard({
  clueMessage,
  onClueChange,
  autoFocus = false,
  prefixMode,
}: SendASignullCardProps) {
  return (
    <div className=" flex h-full w-full flex-col rounded-2xl backdrop-blur-sm">
      {/* Title with pencil/draft icon */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <h2 className="text-center text-sm font-bold uppercase tracking-wider text-draft-accent">
          Send a Signull
        </h2>
      </div>

      {/* Horizontal Divider - dashed draft */}
      <div className="mb-4 w-full border-t-2 border-dashed border-draft-border" />

      {/* Editable Text Area */}
      <div className="relative flex w-full flex-1 items-center justify-center">
        {/* Custom Placeholder */}
        {!clueMessage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2">
            <div className="text-center text-sm leading-relaxed text-draft-muted/70">
              <p>Type a clue for your teammates of a word that:</p>
              <ul className="mt-1 space-y-0.5">
                <li className={!prefixMode ? "line-through opacity-50" : ""}>
                  - begins with same letters as above
                </li>
                <li>- can be of any length</li>
              </ul>
            </div>
          </div>
        )}

        <textarea
          value={clueMessage}
          onChange={(e) => onClueChange(e.target.value)}
          className="z-10 w-full resize-none bg-transparent text-center text-sm leading-relaxed text-draft-text focus:outline-none"
          rows={4}
          autoFocus={autoFocus}
        />
      </div>

      {/* Subtitle Text */}
      <p className="mt-4 text-center text-xs text-draft-muted">
        (Type the word below)
      </p>

      {/* Down Arrow */}
      {/* <svg
        className="h-8 w-8 text-black"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d="M19 9l-7 7-7-7"
        />
      </svg> */}
    </div>
  );
}
