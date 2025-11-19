"use client";

/**
 * EnterSecretWordCard Component
 *
 * Displays a card prompting the clue giver to enter the secret word
 * Features: Title, horizontal divider, instructions, and down arrow
 */
export function EnterSecretWordCard() {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Title */}
      <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-black">
        Enter Secret Word
      </h2>

      {/* Horizontal Divider */}
      <div className="mb-4 w-full border-t-2 border-black" />

      {/* Instructions Text */}
      <div className="flex flex-1 items-center justify-center">
        <p className="text-center text-sm leading-relaxed text-neutral-700">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non
          risus.
        </p>
      </div>

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
