"use client";

import { useState, memo } from "react";

interface VolunteerClueGiverProps {
  onVolunteer: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const VolunteerClueGiver = memo<VolunteerClueGiverProps>(
  ({ onVolunteer, disabled = false, className = "" }) => {
    const [isVolunteering, setIsVolunteering] = useState(false);

    const handleVolunteer = async () => {
      if (disabled || isVolunteering) return;

      setIsVolunteering(true);
      try {
        await onVolunteer();
      } catch (err) {
        console.error("Failed to volunteer as clue giver:", err);
      } finally {
        setIsVolunteering(false);
      }
    };

    return (
      <button
        onClick={handleVolunteer}
        disabled={disabled || isVolunteering}
        className={`
          ${className}
          text-md flex h-10 w-10 items-center justify-center
          rounded-full bg-orange-500 font-bold text-white
          transition-all duration-200 hover:bg-orange-600 sm:h-5
          sm:w-5 sm:text-xl
          md:h-10 md:w-10 md:text-2xl
          ${
            disabled || isVolunteering
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95"
          }
          focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
        `}
        aria-label="Volunteer to be the clue giver"
        title="Volunteer to be the clue giver"
      >
        {isVolunteering ? "..." : "⚡"}
      </button>
    );
  }
);

VolunteerClueGiver.displayName = "VolunteerClueGiver";
