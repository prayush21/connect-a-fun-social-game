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
}

export function SendASignullCard({
  clueMessage,
  onClueChange,
  autoFocus = false,
}: SendASignullCardProps) {
  return (
    <div className=" flex h-full w-full flex-col rounded-2xl backdrop-blur-sm">
      {/* Title with pencil/draft icon */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <h2 className="text-draft-accent text-center text-sm font-bold uppercase tracking-wider">
          Send a Signull
        </h2>
      </div>

      {/* Horizontal Divider - dashed draft */}
      <div className="border-draft-border mb-4 w-full border-t-2 border-dashed" />

      {/* Editable Text Area */}
      <div className="flex flex-1 items-center justify-center">
        <textarea
          value={clueMessage}
          onChange={(e) => onClueChange(e.target.value)}
          placeholder="Type clue for your teammates for a word with same prefix as above but can be of any length"
          className="text-draft-text placeholder-draft-muted/70 w-full resize-none bg-transparent text-center text-sm leading-relaxed focus:outline-none"
          rows={3}
          autoFocus={autoFocus}
        />
      </div>

      {/* Subtitle Text */}
      <p className="text-draft-muted mt-4 text-center text-xs">
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
