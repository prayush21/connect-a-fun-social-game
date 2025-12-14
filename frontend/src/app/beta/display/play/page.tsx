"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBetaStore } from "@/lib/beta/store";
import {
  getAllSignullMetrics,
  type SignullMetrics,
} from "@/lib/beta/selectors";
import { Zap, Target } from "lucide-react";
import { CircularProgress } from "@/components/beta/CircularProgress";
import { ScoreBreakdownDisplay } from "@/components/beta";
import { setScoreCountingComplete } from "@/lib/beta/firebase";

// Read-only letter blocks for display mode
function DisplayLetterBlocks({
  secretWord,
  revealedCount,
  isGameEnded = false,
}: {
  secretWord: string;
  revealedCount: number;
  isGameEnded?: boolean;
}) {
  const letters = secretWord.toUpperCase().split("");
  const wordLength = letters.length;
  const effectiveRevealedCount = isGameEnded ? wordLength : revealedCount;

  // Larger sizing for TV display
  const blockSize = Math.max(48, Math.min(80, 600 / wordLength));
  const fontSize = blockSize * 0.7;
  const gap = Math.min(8, Math.max(4, 160 / wordLength));

  return (
    <div
      className="flex flex-wrap items-center justify-center"
      style={{ gap: `${gap}px` }}
    >
      {letters.map((letter, index) => {
        const isRevealed = index < effectiveRevealedCount;
        return (
          <div
            key={index}
            className={`border-3 flex items-center justify-center rounded-xl border-black font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
              isRevealed
                ? "bg-primary text-white"
                : "bg-neutral-200 text-neutral-400"
            }`}
            style={{
              width: `${blockSize}px`,
              height: `${blockSize}px`,
              fontSize: `${fontSize}px`,
            }}
          >
            {isRevealed ? letter : "?"}
          </div>
        );
      })}
    </div>
  );
}

// Compact signull card for grid display
function DisplaySignullCard({ data }: { data: SignullMetrics }) {
  const {
    clueGiverName,
    clue,
    correctConnectsFromGuessers,
    totalConnectsFromGuessers,
    connectsRequired,
    totalActiveGuessers,
    isIntercepted,
    isInactive,
    isFailed,
    status,
  } = data;

  const isPending = status === "pending";

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
        isInactive || isFailed ? "opacity-50 grayscale" : ""
      } ${isPending ? "ring-2 ring-primary ring-offset-2" : ""}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-wide text-neutral-700">
          {clueGiverName}
        </span>
        <div className="flex items-center gap-2">
          <CircularProgress
            connectsReceived={correctConnectsFromGuessers}
            connectsRequired={connectsRequired}
            isIntercepted={isIntercepted}
            isInactive={isInactive}
            isFailed={isFailed}
          />
          <span className="text-sm font-bold">
            {totalConnectsFromGuessers}/{totalActiveGuessers}
          </span>
        </div>
      </div>

      {/* Clue */}
      <div className="flex-1">
        <p className="text-center text-lg font-medium leading-snug">{clue}</p>
      </div>

      {/* Status Badge */}
      {!isPending && (
        <div className="mt-3 text-center">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              isIntercepted
                ? "bg-red-100 text-red-700"
                : isFailed
                  ? "bg-orange-100 text-orange-700"
                  : isInactive
                    ? "bg-neutral-100 text-neutral-500"
                    : "bg-green-100 text-green-700"
            }`}
          >
            {isIntercepted
              ? "Intercepted"
              : isFailed
                ? "Failed"
                : isInactive
                  ? "Inactive"
                  : "Resolved"}
          </span>
        </div>
      )}
    </div>
  );
}

export default function BetaDisplayPlayPage() {
  const router = useRouter();
  const {
    roomId,
    game: gameState,
    initialized,
    isDisplayMode,
    teardown,
  } = useBetaStore();

  const gamePhase = gameState?.phase ?? "lobby";
  const secretWord = gameState?.secretWord ?? "";
  const revealedCount = gameState?.revealedCount ?? 0;
  const directGuessesLeft = gameState?.directGuessesLeft ?? 0;
  const lastDirectGuess = gameState?.lastDirectGuess;
  const winner = gameState?.winner;
  const players = gameState?.players ?? {};
  const scoreEvents = gameState?.scoreEvents ?? [];
  const signullState = gameState?.signullState;
  const showScoreBreakdown = gameState?.settings?.showScoreBreakdown ?? false;
  const scoreCountingComplete = gameState?.scoreCountingComplete ?? false;

  // Get all signull metrics
  const allSignulls = getAllSignullMetrics(gameState);

  // Filter to show only pending and recently resolved signulls from current round
  const activeSignulls = allSignulls.filter(
    (s) =>
      s.status === "pending" ||
      s.status === "resolved" ||
      s.status === "blocked"
  );

  // Handle score counting complete callback
  const handleScoreCountingComplete = useCallback(async () => {
    if (roomId) {
      await setScoreCountingComplete(roomId);
    }
  }, [roomId]);

  // Redirect logic
  useEffect(() => {
    if (!roomId) {
      router.push("/beta");
      return;
    }

    if (initialized && !isDisplayMode) {
      router.push("/beta/lobby");
      return;
    }

    // If back to lobby phase, go back to display lobby
    if (initialized && gamePhase === "lobby") {
      router.push("/beta/display");
    }
  }, [roomId, gamePhase, router, initialized, isDisplayMode]);

  // Handle exit
  const handleExit = () => {
    teardown();
    router.push("/beta");
  };

  // Loading state
  if (!initialized || !gameState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-2xl font-bold">Loading...</div>
      </main>
    );
  }

  // Game ended state - check if we should show score breakdown first
  if (gamePhase === "ended") {
    // Show score breakdown animation if enabled and not yet complete
    if (
      showScoreBreakdown &&
      !scoreCountingComplete &&
      signullState &&
      winner !== undefined
    ) {
      return (
        <ScoreBreakdownDisplay
          scoreEvents={scoreEvents}
          players={players}
          signullState={signullState}
          winner={winner}
          secretWord={secretWord}
          onComplete={handleScoreCountingComplete}
        />
      );
    }

    // Show final scoreboard after score counting is complete
    const playerList = Object.values(players).sort((a, b) => b.score - a.score);

    return (
      <main className="min-h-screen bg-surface p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-primary">Signull</h1>
            </div>
            <button
              onClick={handleExit}
              className="rounded-lg border-2 border-black bg-white px-4 py-2 font-semibold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              Exit Display
            </button>
          </div>

          {/* Game Ended Card */}
          <div className="rounded-3xl border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-4xl font-bold">
                {winner === "guessers" ? "🎉 Guessers Win!" : "🛡️ Setter Wins!"}
              </h2>
              <p className="text-xl text-neutral-600">
                The secret word was:{" "}
                <span className="font-bold text-primary">{secretWord}</span>
              </p>
            </div>

            {/* Final Letter Blocks */}
            <div className="mb-8">
              <DisplayLetterBlocks
                secretWord={secretWord}
                revealedCount={revealedCount}
                isGameEnded={true}
              />
            </div>

            {/* Scoreboard */}
            <div className="mx-auto max-w-2xl">
              <h3 className="mb-4 text-center text-xl font-bold">
                Final Scores
              </h3>
              <div className="space-y-2">
                {playerList.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-xl border-2 border-black p-4 ${
                      index === 0 ? "bg-yellow-100" : "bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-neutral-400">
                        #{index + 1}
                      </span>
                      <span className="text-lg font-semibold">
                        {player.name}
                      </span>
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs capitalize">
                        {player.role}
                      </span>
                    </div>
                    <span className="text-2xl font-bold">
                      {player.score} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Setting phase - waiting for secret word
  if (gamePhase === "setting") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-8">
        <div className="rounded-3xl border-2 border-black bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Zap className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h2 className="mb-2 text-3xl font-bold">Setting Up...</h2>
          <p className="text-xl text-neutral-600">
            Waiting for the setter to choose a secret word
          </p>
        </div>
      </main>
    );
  }

  // Main game display (signulls phase)
  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">Signull</h1>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {roomId}
            </span>
          </div>

          {/* Direct Guesses Counter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">
                {directGuessesLeft} Direct{" "}
                {directGuessesLeft === 1 ? "Guess" : "Guesses"} Left
              </span>
            </div>
            <button
              onClick={handleExit}
              className="rounded-lg border-2 border-black bg-white px-4 py-2 font-semibold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Letter Blocks - Prominent Display */}
        <div className="mb-8 rounded-3xl border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <DisplayLetterBlocks
            secretWord={secretWord}
            revealedCount={revealedCount}
          />

          {/* Last Direct Guess Banner */}
          {lastDirectGuess && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-center">
              <span className="text-lg">
                <strong>{lastDirectGuess.playerName}</strong> guessed{" "}
                <strong className="text-red-600">{lastDirectGuess.word}</strong>
                {" — "}
                <span className="text-red-600">Wrong!</span>
              </span>
            </div>
          )}
        </div>

        {/* Active Signulls Grid */}
        <div>
          <h2 className="mb-4 text-xl font-bold">
            Active Signulls (
            {activeSignulls.filter((s) => s.status === "pending").length})
          </h2>

          {activeSignulls.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-12 text-center">
              <p className="text-xl text-neutral-500">
                Waiting for players to send signulls...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeSignulls.map((signull) => (
                <DisplaySignullCard key={signull.signullId} data={signull} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
