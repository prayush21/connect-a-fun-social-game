"use client";

import { useState } from "react";

/**
 * SendASignullCard Component
 *
 * Displays a card prompting the user to send a signull message
 * Features: Title, horizontal divider, editable text area, and down arrow
 */
export function SendASignullCard() {
  const [message, setMessage] = useState("");

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Title */}
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-black">
        Send a Signull
      </h2>

      {/* Horizontal Divider */}
      <div className="mb-4 w-full border-t-2 border-black" />

      {/* Editable Text Area */}
      <div className="flex flex-1 items-center justify-center">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type clue for your teammates for a word with same prefix as above"
          className="w-full resize-none bg-transparent text-center text-sm leading-relaxed text-neutral-700 placeholder-neutral-400 focus:outline-none"
          rows={3}
        />
      </div>

      {/* Subtitle Text */}
      <p className="mt-4 text-center text-xs text-neutral-500">
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
