/**
 * Core game logic functions ported from vanilla JS implementation
 * Handles game state transitions, validation, and business rules
 */

import type { GameState, PlayerId, GamePhase, Player } from "./types";

/**
 * Word validation utilities
 */
export const validateSecretWord = (
  word: string
): { isValid: boolean; error?: string } => {
  const trimmed = word.trim().toUpperCase();

  if (!trimmed) {
    return { isValid: false, error: "Word cannot be empty" };
  }

  if (!/^[A-Z]+$/.test(trimmed)) {
    return { isValid: false, error: "Word must contain only letters" };
  }

  if (trimmed.length < 5 || trimmed.length > 12) {
    return { isValid: false, error: "Word must be 5-12 letters long" };
  }

  return { isValid: true };
};

export const validateReferenceWord = (
  referenceWord: string,
  secretWord: string,
  revealedCount: number
): { isValid: boolean; error?: string } => {
  const trimmed = referenceWord.trim().toLowerCase();
  const secretLower = secretWord.toLowerCase();
  const revealedPrefix = secretLower.slice(0, revealedCount);

  if (!trimmed) {
    return { isValid: false, error: "Reference word cannot be empty" };
  }

  if (!/^[a-z]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: "Reference word must contain only letters",
    };
  }

  if (!trimmed.startsWith(revealedPrefix)) {
    return {
      isValid: false,
      error: `Reference word must start with "${revealedPrefix.toUpperCase()}"`,
    };
  }

  return { isValid: true };
};

export const validateDirectGuess = (
  guess: string,
  secretWord: string,
  revealedCount: number
): { isValid: boolean; error?: string } => {
  const trimmed = guess.trim().toUpperCase();
  const secretUpper = secretWord.toUpperCase();
  const revealedPrefix = secretUpper.slice(0, revealedCount);

  if (!trimmed) {
    return { isValid: false, error: "Guess cannot be empty" };
  }

  if (!/^[A-Z]+$/.test(trimmed)) {
    return { isValid: false, error: "Guess must contain only letters" };
  }

  if (trimmed.length !== secretWord.length) {
    return {
      isValid: false,
      error: `Guess must be exactly ${secretWord.length} letters long`,
    };
  }

  if (!trimmed.startsWith(revealedPrefix)) {
    return {
      isValid: false,
      error: `Guess must start with "${revealedPrefix}"`,
    };
  }

  return { isValid: true };
};

/**
 * Game phase transition logic
 */
export const canStartGame = (
  gameState: GameState
): { canStart: boolean; error?: string } => {
  if (gameState.gamePhase !== "lobby") {
    return { canStart: false, error: "Game is not in lobby phase" };
  }

  const playerCount = Object.keys(gameState.players).length;
  if (playerCount < 3) {
    return { canStart: false, error: "Need at least 3 players to start" };
  }

  const setterCount = Object.values(gameState.players).filter(
    (p) => p.role === "setter"
  ).length;
  if (setterCount !== 1) {
    return { canStart: false, error: "Need exactly 1 word setter" };
  }

  return { canStart: true };
};

export const canSetWord = (
  gameState: GameState,
  playerId: PlayerId
): { canSet: boolean; error?: string } => {
  if (gameState.gamePhase !== "setting_word") {
    return { canSet: false, error: "Not in word setting phase" };
  }

  const player = gameState.players[playerId];
  if (!player) {
    return { canSet: false, error: "Player not found" };
  }

  if (player.role !== "setter") {
    return { canSet: false, error: "Only the word setter can set the word" };
  }

  return { canSet: true };
};

/**
 * Reference resolution logic - core game mechanic
 */
export const calculateReferenceResolution = (
  gameState: GameState
): {
  shouldResolve: boolean;
  resolution?: {
    type: "success" | "failure" | "setter_blocked" | "climactic_win";
    newRevealedCount?: number;
    winner?: "guessers" | "setter";
    message: string;
    nextClueGiver?: PlayerId;
  };
} => {
  const {
    currentReference,
    players,
    secretWord,
    revealedCount,
    settings,
    clueGiverTurn,
  } = gameState;

  if (!currentReference) {
    return { shouldResolve: false };
  }

  // Get active guessers (excluding clue giver)
  const guesserIds = getOrderedGuesserIds(players);
  const activeGuesserIds = guesserIds.filter(
    (id) => id !== currentReference.clueGiverId
  );

  if (activeGuesserIds.length === 0) {
    return { shouldResolve: false };
  }

  // Check if setter blocked the reference
  if (
    currentReference.setterAttempt &&
    currentReference.setterAttempt === currentReference.referenceWord
  ) {
    const nextTurn = (clueGiverTurn + 1) % guesserIds.length;
    const nextClueGiver = guesserIds[nextTurn];

    return {
      shouldResolve: true,
      resolution: {
        type: "setter_blocked",
        message: `Setter blocked with '${currentReference.referenceWord}' → Round failed`,
        nextClueGiver,
      },
    };
  }

  // Check if enough guessers have submitted
  const guesses = currentReference.guesses || {};
  const submittedGuessers = activeGuesserIds.filter((id) => guesses[id]);

  // Handle climactic round (reference word equals secret word)
  if (currentReference.isClimactic) {
    // Require majority submissions before resolving climactic win
    const guesses = currentReference.guesses || {};
    const submittedGuessers = activeGuesserIds.filter((id) => guesses[id]);
    const rawThreshold = settings.majorityThreshold ?? 1;
    const maxEligible = Math.max(activeGuesserIds.length, 1);
    const interpretedThreshold = rawThreshold;
    const majorityRequired = Math.max(1, Math.min(interpretedThreshold, maxEligible));

    if (submittedGuessers.length >= majorityRequired) {
      return {
        shouldResolve: true,
        resolution: {
          type: "climactic_win",
          winner: "guessers",
          newRevealedCount: secretWord.length,
          message: "Final round hit! Guessers win!",
        },
      };
    }
    return { shouldResolve: false };
  }

  // Group guesses by their value to find matches
  const guessGroups: Record<string, string[]> = {};
  submittedGuessers.forEach((id) => {
    const guess = guesses[id];
    if (!guessGroups[guess]) {
      guessGroups[guess] = [];
    }
    guessGroups[guess].push(id);
  });

  // Find the largest group of matching guesses
  const largestGroup = Object.values(guessGroups).reduce(
    (largest, current) => (current.length > largest.length ? current : largest),
    []
  );

  // Absolute majority threshold: clamp to eligible active guessers; support legacy percent if >100
  const rawThreshold = settings.majorityThreshold || 1;
  const maxEligible = Math.max(activeGuesserIds.length, 1);
  const majorityThreshold = Math.max(
    1,
    Math.min(
      rawThreshold > 100
        ? Math.ceil(maxEligible * (rawThreshold / 100))
        : rawThreshold,
      maxEligible
    )
  );

  // Check if the largest group meets the threshold and matches the reference word
  if (largestGroup.length >= majorityThreshold) {
    const matchingGuess = Object.keys(guessGroups).find(
      (guess) => guessGroups[guess] === largestGroup
    );

    if (matchingGuess === currentReference.referenceWord) {
      const newRevealedCount = revealedCount + 1;
      const nextTurn = (clueGiverTurn + 1) % guesserIds.length;
      const nextClueGiver = guesserIds[nextTurn];

      // Check if game is won by revealing all letters
      if (newRevealedCount >= secretWord.length) {
        return {
          shouldResolve: true,
          resolution: {
            type: "success",
            winner: "guessers",
            newRevealedCount,
            message: "Word complete! Guessers win!",
          },
        };
      }

      return {
        shouldResolve: true,
        resolution: {
          type: "success",
          newRevealedCount,
          message: `Connected on "${currentReference.referenceWord}" → Revealed '${secretWord[revealedCount].toUpperCase()}' (${largestGroup.length}/${activeGuesserIds.length})`,
          nextClueGiver,
        },
      };
    }

    // Majority matched but guess was incorrect
    const nextTurn = (clueGiverTurn + 1) % guesserIds.length;
    const nextClueGiver = guesserIds[nextTurn];

    return {
      shouldResolve: true,
      resolution: {
        type: "failure",
        message: `Majority wrong (${largestGroup.length}/${activeGuesserIds.length}) → Round failed`,
        nextClueGiver,
      },
    };
  }

  // No majority consensus reached - don't resolve yet
  return { shouldResolve: false };
};

/**
 * Direct guess resolution
 */
export const resolveDirectGuess = (
  gameState: GameState,
  guess: string,
  playerId: PlayerId
): {
  isCorrect: boolean;
  winner?: "guessers" | "setter";
  newDirectGuessesLeft: number;
  message: string;
} => {
  const player = gameState.players[playerId];
  const newDirectGuessesLeft = gameState.directGuessesLeft - 1;

  if (guess.toUpperCase() === gameState.secretWord.toUpperCase()) {
    return {
      isCorrect: true,
      winner: "guessers",
      newDirectGuessesLeft,
      message: `${player.name} guessed it: ${guess}!`,
    };
  }

  if (newDirectGuessesLeft <= 0) {
    return {
      isCorrect: false,
      winner: "setter",
      newDirectGuessesLeft: 0,
      message: `${player.name} tried ${guess} (incorrect)`,
    };
  }

  const guessPlural = newDirectGuessesLeft > 1 ? 'guesses' : 'guess';
  return {
    isCorrect: false,
    newDirectGuessesLeft,
    message: `${player.name} tried ${guess} (incorrect). ${newDirectGuessesLeft} direct ${guessPlural} remaining`,
  };
};

/**
 * Player management utilities
 */
export const canRemovePlayer = (
  gameState: GameState,
  removerId: PlayerId,
  targetId: PlayerId
): { canRemove: boolean; error?: string } => {
  if (removerId === targetId) {
    return { canRemove: false, error: "Cannot remove yourself" };
  }

  const remover = gameState.players[removerId];
  const target = gameState.players[targetId];

  if (!remover || !target) {
    return { canRemove: false, error: "Player not found" };
  }

  // Only setter can remove players
  if (remover.role !== "setter") {
    return {
      canRemove: false,
      error: "Only the word setter can remove players",
    };
  }

  return { canRemove: true };
};

export const canChangeRole = (
  gameState: GameState,
  changerId: PlayerId,
  targetId: PlayerId,
  newRole: "setter" | "guesser"
): { canChange: boolean; error?: string } => {
  if (gameState.gamePhase !== "lobby") {
    return { canChange: false, error: "Can only change roles in lobby" };
  }

  const changer = gameState.players[changerId];
  const target = gameState.players[targetId];

  if (!changer || !target) {
    return { canChange: false, error: "Player not found" };
  }

  // Only setter can change roles
  if (changer.role !== "setter") {
    return { canChange: false, error: "Only the word setter can change roles" };
  }

  if (target.role === newRole) {
    return { canChange: false, error: "Player already has that role" };
  }

  // Prevent removing the only setter
  if (target.role === "setter" && newRole === "guesser") {
    const setterCount = Object.values(gameState.players).filter(
      (p) => p.role === "setter"
    ).length;
    if (setterCount === 1) {
      return {
        canChange: false,
        error: "Must have at least one setter. Promote another player first.",
      };
    }
  }

  return { canChange: true };
};

/**
 * Utility functions
 */

/**
 * Get ordered list of guesser IDs - CRITICAL: This must be used everywhere
 * to ensure consistent clue giver turn calculation across all components
 */
export const getOrderedGuesserIds = (
  players: Record<PlayerId, Player>
): PlayerId[] => {
  return Object.keys(players)
    .filter((id) => players[id].role === "guesser")
    .sort(); // Consistent alphabetical ordering
};

export const getNextClueGiver = (gameState: GameState): PlayerId | null => {
  const guesserIds = getOrderedGuesserIds(gameState.players);

  if (guesserIds.length === 0) return null;

  const currentTurn = gameState.clueGiverTurn || 0;
  return guesserIds[currentTurn % guesserIds.length];
};

/**
 * Calculate new clue giver turn when a player is removed
 */
export const calculateClueGiverTurnAfterRemoval = (
  gameState: GameState,
  removedPlayerId: PlayerId
): {
  newClueGiverTurn: number;
  needsNewClueGiver: boolean;
  shouldClearReference: boolean;
} => {
  const { players, clueGiverTurn, currentReference } = gameState;

  // Get current guesser list before removal
  const currentGuesserIds = getOrderedGuesserIds(players);

  // Get guesser list after removal
  const remainingGuesserIds = currentGuesserIds.filter(
    (id) => id !== removedPlayerId
  );

  if (remainingGuesserIds.length === 0) {
    return {
      newClueGiverTurn: 0,
      needsNewClueGiver: false,
      shouldClearReference: true,
    };
  }

  // Check if the removed player was the current clue giver
  const currentClueGiverId =
    currentGuesserIds[clueGiverTurn % currentGuesserIds.length];
  const isCurrentClueGiver = removedPlayerId === currentClueGiverId;

  // Check if the removed player was the expected clue giver based on active reference
  const isExpectedClueGiver = currentReference?.clueGiverId === removedPlayerId;

  // If the removed player was the clue giver or expected clue giver, clear the reference
  const shouldClearReference = isCurrentClueGiver || isExpectedClueGiver;

  // Calculate new turn index
  let newClueGiverTurn = clueGiverTurn;
  const removedPlayerIndex = currentGuesserIds.indexOf(removedPlayerId);

  if (removedPlayerIndex !== -1) {
    // If we removed someone at or before the current turn, keep the same index
    // (which will now point to the next person in the remaining array)
    if (removedPlayerIndex <= clueGiverTurn) {
      newClueGiverTurn = clueGiverTurn;
    }
    // If we removed someone after the current turn, no adjustment needed

    // Make sure the index is valid for the remaining players
    newClueGiverTurn = newClueGiverTurn % remainingGuesserIds.length;
  }

  return {
    newClueGiverTurn,
    needsNewClueGiver: isCurrentClueGiver || isExpectedClueGiver,
    shouldClearReference,
  };
};

export const getRevealedWord = (
  secretWord: string,
  revealedCount: number
): string => {
  return secretWord
    .split("")
    .map((letter, index) =>
      index < revealedCount ? letter.toUpperCase() : "_"
    )
    .join("");
};

export const isGamePhaseTransitionValid = (
  currentPhase: GamePhase,
  newPhase: GamePhase
): boolean => {
  const validTransitions: Record<GamePhase, GamePhase[]> = {
    lobby: ["setting_word"],
    setting_word: ["guessing"],
    guessing: ["ended", "lobby"], // ended or back to lobby for new round
    ended: ["lobby"],
  };

  return validTransitions[currentPhase]?.includes(newPhase) ?? false;
};

/**
 * Handles the logic when a setter leaves the game
 */
export const handleSetterLeaving = (
  gameState: GameState,
  leavingPlayerId: PlayerId
): {
  shouldReassignSetter: boolean;
  newSetterId?: PlayerId;
  shouldResetToLobby: boolean;
  error?: string;
} => {
  // Check if the leaving player is actually the setter
  if (gameState.setterUid !== leavingPlayerId) {
    return { shouldReassignSetter: false, shouldResetToLobby: false };
  }

  // Get remaining players after this player leaves
  const remainingPlayers = Object.entries(gameState.players)
    .filter(([id]) => id !== leavingPlayerId)
    .map(([, player]) => ({ ...player }));

  // If no players remain, no need to reassign
  if (remainingPlayers.length === 0) {
    return {
      shouldReassignSetter: false,
      shouldResetToLobby: false,
      error: "No players remaining in room",
    };
  }

  // Find the first available player to promote to setter
  const newSetter = remainingPlayers[0];

  return {
    shouldReassignSetter: true,
    newSetterId: newSetter.id,
    shouldResetToLobby: true,
  };
};