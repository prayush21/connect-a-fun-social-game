"use client";

import { NextStepProvider, NextStep } from "nextstepjs";
import { TutorialCard } from "./TutorialCard";
import { useBetaStore } from "@/lib/beta/store";
import { useEffect } from "react";

const steps = [
  {
    tour: "gameTour",
    steps: [
      {
        icon: "👋",
        title: "Welcome to Connect!",
        content: "Let's take a quick tour of the game interface.",
        selector: "body",
        side: "center",
        showControls: true,
        showSkip: true,
      },
      {
        icon: "ℹ️",
        title: "Room Info",
        content: "Tap here to see players, settings, and room code.",
        selector: "#tour-room-info",
        side: "bottom",
      },
      {
        icon: "🔤",
        title: "Secret Word",
        content:
          "The secret word is revealed here letter by letter as you win rounds.",
        selector: "#tour-letter-blocks",
        side: "bottom",
      },
      {
        icon: "🃏",
        title: "Game Cards",
        content:
          "Swipe left/right to view history. The active card shows current action or Signull.",
        selector: "#tour-card-container",
        side: "top",
      },
      {
        icon: "⚡",
        title: "Send a Signull",
        content:
          "If you have a clue, tap the lightning bolt to send a Signull to the team.",
        selector: "#tour-action-bar-signull",
        side: "top",
      },
      {
        icon: "💬",
        title: "Guess & Connect",
        content:
          "Type your guess here to connect to a Signull or match the secret word.",
        selector: "#tour-action-bar-input",
        side: "top",
      },
    ],
  },
];

export const TutorialWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <NextStepProvider>
      <NextStep steps={steps} cardComponent={TutorialCard}>
        {children}
      </NextStep>
    </NextStepProvider>
  );
};
