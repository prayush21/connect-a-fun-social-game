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
        // icon: "👋",
        title: "Welcome to C⚡S!",
        content: "Let's take a quick tour of the game interface.",
        selector: "#tour-logo",
        side: "bottom-right",
        showControls: true,
        showSkip: true,
      },
      {
        // icon: "ℹ️",
        title: "Room Info",
        content:
          "Tap here to see roomcode. On dropdown, host can change setter during word setting phase.",
        selector: "#tour-room-info",
        side: "bottom-left",
        showSkip: true,
      },
      {
        // icon: "🔤",
        title: "Secret Word",
        content:
          "The secret word is revealed here letter by letter as guessers win Signulls.",
        selector: "#tour-letter-blocks",
        side: "bottom",
        showSkip: true,
      },
      {
        // icon: "🃏",
        title: "Game Cards",
        content:
          "Signull cards show up here. Use left/right arrows to view other Signull cards.",
        selector: "#tour-card-container",
        side: "top",
        showSkip: true,
      },
      {
        title: "Clue Giver Name",
        content: "The name of the player who sent this Signull is shown here.",
        selector: "#tour-clue-giver",
        side: "bottom-left",
        showSkip: true,
      },
      {
        title: "Correct Indicator",
        content:
          "Circular indicator fills up when guessers submit correct Connects",
        selector: "#tour-correct-indicator",
        side: "bottom-right",
        showSkip: true,
      },
      {
        title: "Guesser Connects",
        content:
          "This shows how many guessers have connected to this Signull out of the total active guessers.",
        selector: "#tour-guesser-connects",
        side: "bottom-right",
        showSkip: true,
      },
      {
        // icon: "⚡",
        title: "Send a Signull",
        content:
          "If you have a clue, tap the lightning bolt to send a Signull to the team.",
        selector: "#tour-action-bar-signull",
        side: "top-left",
        showSkip: true,
      },
      {
        // icon: "💬",
        title: "Guess & Connect",
        content:
          "Type your guess here to connect to a Signull and submit your connection.",
        selector: "#tour-action-bar-input",
        side: "top",
        showSkip: true,
      },
      {
        // icon: "✅",
        title: "Submit button",
        content: "Submit your connection or the Signull word pressiing here.",
        selector: "#tour-action-bar-submit",
        side: "top-right",
      },
      {
        // icon: "💬",
        title: "Signull Log",
        content:
          "Here you can see all the connections that have been sent to current Signull.",
        selector: "#tour-action-bar-log",
        side: "bottom",
      },
    ],
  },
] as const;

export const TutorialWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <NextStepProvider>
      <NextStep steps={steps as any} cardComponent={TutorialCard}>
        {children}
      </NextStep>
    </NextStepProvider>
  );
};
