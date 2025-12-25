"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNextStep } from "nextstepjs";
import {
  RoomInfoButton,
  LetterBlocks,
  BaseCard,
  ActionBar,
  TutorialWrapper,
  RoundButtonIcon,
  SignullHistoryInline,
} from "@/components/beta";
import { SignullCard, WaitingCard } from "@/components/beta/cards";
import { motion } from "framer-motion";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";
import { id } from "zod/v4/locales";

export default function TourPage() {
  return (
    <TutorialWrapper>
      <TourContent />
    </TutorialWrapper>
  );
}

function TourContent() {
  const router = useRouter();
  const { startNextStep } = useNextStep();

  useEffect(() => {
    // Start the tour immediately
    startNextStep("gameTour");
  }, [startNextStep]);

  // Mock Data
  const roomCode = "TOUR";
  const players = [
    {
      id: "1",
      name: "You",
      role: "guesser" as const,
      isOnline: true,
      lastActive: new Date(),
      score: 0,
    },
    {
      id: "2",
      name: "Dustin",
      role: "setter" as const,
      isOnline: true,
      lastActive: new Date(),
      score: 0,
    },
    {
      id: "3",
      name: "Steve",
      role: "guesser" as const,
      isOnline: true,
      lastActive: new Date(),
      score: 0,
    },
  ];
  const secretWord = "PLANET";
  const revealedCount = 3; // P L A _ _ _

  // Mock Card
  const activeCard = {
    id: "tour-card",
    type: "signull",
    metrics: {
      signullId: "tour-signull",
      clueGiverId: "3",
      clueGiverName: "Steve",
      clue: "Wall-e's godchild",
      word: "PLANT",
      status: "pending" as const,
      correctConnectsFromGuessers: 0,
      totalConnectsFromGuessers: 0,
      connectsRequired: 2,
      totalActiveGuessers: 2,
      isComplete: false,
      isIntercepted: false,
      isInactive: false,
      isFailed: false,
      isFinal: false,
      allConnects: [
        {
          playerId: "h2",
          playerName: "Dustin",
          playerRole: "guesser" as const,
          guess: "PLANT",
          isCorrect: true,
          timestamp: new Date(),
        },
      ],
    },
  };

  const mockHistory = [
    {
      id: "h1",
      username: "Steve",
      message: "Wall-e's godchild",
      timestamp: "2m ago",
      role: "guesser" as const,
      isClueGiver: true,
    },
    {
      id: "h2",
      username: "Alice",
      message: "Connect Sent",
      timestamp: "Just now",
      role: "setter" as const,
      isClueGiver: false,
    },
    {
      id: "h3",
      username: "You",
      message: "Connect Sent",
      timestamp: "Just now",
      role: "guesser" as const,
      isClueGiver: false,
    },
  ];

  const [inputValue, setInputValue] = useState("");

  const handleSkipOrFinish = () => {
    router.push("/beta");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-200 p-0 md:p-4">
      {/* Mobile Container */}
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-neutral-100 md:h-[calc(100dvh-2rem)] md:rounded-3xl md:shadow-2xl">
        {/* HEADER */}
        <header className="sticky top-0 z-[100] flex h-16 items-center justify-between gap-3 bg-neutral-100 px-4 py-2">
          <div id="tour-room-info">
            <RoomInfoButton
              roomCode={roomCode}
              players={players}
              currentPlayerId="1"
              connectsRequired={2}
              prefixMode={false}
              canChangeSetter={false}
              onChangeSetter={() => {}}
            />
          </div>
          <div id="tour-logo">
            <Logo />
          </div>
        </header>

        {/* LETTER BLOCKS */}
        <div id="tour-letter-blocks" className="px-6">
          <LetterBlocks
            secretWord={secretWord}
            revealedCount={revealedCount}
            isDirectGuessMode={false}
            isGameEnded={false}
            onSubmit={() => {}}
            onCancel={() => {}}
          />
        </div>

        {/* CARD CONTAINER */}
        <div
          id="tour-card-container"
          className="relative flex-shrink-0 overflow-visible px-6"
        >
          {/* Navigation Arrows (Mocked visual only) */}
          <div className="absolute left-0 top-1/2 z-[60] -translate-y-1/2 pl-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm">
              <svg
                className="h-6 w-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </div>
          </div>

          <div className="absolute right-0 top-1/2 z-[60] -translate-y-1/2 pr-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm">
              <svg
                className="h-6 w-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>

          <div
            className="relative mx-auto my-2 max-w-md"
            style={{ aspectRatio: "3 / 2" }}
          >
            {/* Mock Previous Card (Right - Past) */}
            <motion.div
              className="absolute left-0 right-0"
              initial={{
                x: 25,
                scale: 0.95,
                rotate: 2,
                opacity: 0.8,
                zIndex: 49,
              }}
              style={{ transformOrigin: "center bottom" }}
            >
              <BaseCard
                state="stacked"
                stackIndex={1}
                className="border-2 border-black"
              >
                <div style={{ aspectRatio: "3 / 2" }}>
                  <WaitingCard />
                </div>
              </BaseCard>
            </motion.div>

            {/* Mock Next Card (Left - Future) */}
            <motion.div
              className="absolute left-0 right-0"
              initial={{
                x: -25,
                scale: 0.95,
                rotate: -2,
                opacity: 0.8,
                zIndex: 49,
              }}
              style={{ transformOrigin: "center bottom" }}
            >
              <BaseCard
                state="stacked"
                stackIndex={1}
                className="border-2 border-dashed border-black"
              >
                <div style={{ aspectRatio: "3 / 2" }}>
                  <WaitingCard />
                </div>
              </BaseCard>
            </motion.div>

            {/* Active Card */}
            <motion.div
              className="absolute left-0 right-0"
              initial={{ scale: 1, y: 0, opacity: 1, zIndex: 50 }}
              style={{ transformOrigin: "center bottom" }}
            >
              <BaseCard
                state="active"
                stackIndex={0}
                className="border-2 border-black"
              >
                <div style={{ aspectRatio: "3 / 2" }}>
                  <SignullCard data={activeCard.metrics} />
                </div>
              </BaseCard>
            </motion.div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div id="tour-action-bar-wrapper">
          <ActionBar
            inputValue={inputValue}
            onInputChange={setInputValue}
            onInputFocus={() => {}}
            onInputBlur={() => {}}
            onSignullClick={() => {}}
            onSubmit={() => {}}
            placeholder="Type response"
            disableInput={false}
            disableSignull={false}
            disableSubmit={!inputValue}
            isGameEnded={false}
            onPlayAgain={() => {}}
            onBackToLobby={() => {}}
            onMemoriesClick={() => {}}
          />
        </div>

        {/* Signull History */}
        <div id="tour-action-bar-log" className="px-4 pb-2">
          <SignullHistoryInline items={mockHistory} maxVisible={3} />
        </div>

        {/* Keyboard Safe Area */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
