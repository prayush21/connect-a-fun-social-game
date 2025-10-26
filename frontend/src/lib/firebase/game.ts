// Firebase client-side game operations
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  deleteField,
  serverTimestamp,
  Timestamp,
  FieldValue,
  Unsubscribe,
  runTransaction,
} from "firebase/firestore";
import { getDb } from "./config";
import { calculateClueGiverTurnAfterRemoval } from "../game-logic";
import type {
  GameState,
  FirestoreGameRoom,
  Player,
  GameSettings,
  PlayerId,
  RoomId,
} from "../types";

// Collection reference getter
const getGameRoomsCollection = () => collection(getDb(), "game_rooms");

// Convert Firestore document to GameState
export const firestoreToGameState = (data: FirestoreGameRoom): GameState => {
  // Back-compat: convert legacy percent (thresholdMajority) to absolute using eligible guessers (G-1)
  const playersObj = data.players || {};
  const totalGuessers = Object.keys(playersObj).filter(
    (id) => playersObj[id]?.role === "guesser"
  ).length;
  const eligibleGuessers = Math.max(totalGuessers - 1, 1);
  const legacyPercent = data.thresholdMajority;
  const absoluteFromLegacy =
    typeof legacyPercent === "number"
      ? Math.max(
          1,
          Math.min(
            Math.ceil(eligibleGuessers * (legacyPercent / 100)),
            eligibleGuessers
          )
        )
      : undefined;
  const pickedAbsolute =
    data.settings?.majorityThreshold ?? absoluteFromLegacy ?? 2;
  return {
    roomId: data.roomId,
    gamePhase: data.gamePhase,
    secretWord: data.secretWord || "",
    revealedCount: data.revealedCount || 1,
    players: Object.entries(data.players || {}).reduce(
      (acc, [id, player]) => {
        acc[id] = {
          id,
          name: player.name,
          role: player.role,
          isOnline: player.isOnline ?? true,
          lastActive:
            player.lastActive instanceof Timestamp
              ? player.lastActive.toDate()
              : new Date(),
        };
        return acc;
      },
      {} as Record<PlayerId, Player>
    ),
    currentReference: data.currentReference
      ? {
          clueGiverId: data.currentReference.clueGiverId,
          referenceWord: data.currentReference.referenceWord,
          clue: data.currentReference.clue,
          guesses: data.currentReference.guesses || {},
          setterAttempt: data.currentReference.setterAttempt || "",
          isClimactic: data.currentReference.isClimactic || false,
          timestamp:
            data.currentReference.timestamp instanceof Timestamp
              ? data.currentReference.timestamp.toDate()
              : new Date(),
        }
      : null,
    directGuessesLeft: data.directGuessesLeft ?? 3,
    // Keep legacy percent available for display; if absent, mirror absolute
    thresholdMajority:
      typeof legacyPercent === "number" ? legacyPercent : pickedAbsolute,
    settings: {
      majorityThreshold: pickedAbsolute,
      timeLimit: data.settings?.timeLimit ?? 30,
      maxPlayers: data.settings?.maxPlayers ?? 8,
      wordValidation: data.settings?.wordValidation ?? "strict",
    },
    clueGiverTurn: data.clueGiverTurn || 0,
    roundNumber: data.roundNumber || 1,
    setterUid: data.setterUid,
    winner: data.winner,
    gameHistory: data.gameHistory || [],
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(),
  };
};

// Convert GameState to Firestore document
export const gameStateToFirestore = (
  gameState: GameState
): Partial<FirestoreGameRoom> => {
  return {
    roomId: gameState.roomId,
    gamePhase: gameState.gamePhase,
    secretWord: gameState.secretWord,
    revealedCount: gameState.revealedCount,
    clueGiverTurn: gameState.clueGiverTurn,
    roundNumber: gameState.roundNumber,
    setterUid: gameState.setterUid,
    players: Object.entries(gameState.players).reduce(
      (acc, [id, player]) => {
        acc[id] = {
          name: player.name,
          role: player.role,
          isOnline: player.isOnline,
          lastActive: serverTimestamp(),
        };
        return acc;
      },
      {} as Record<
        string,
        {
          name: string;
          role: "setter" | "guesser";
          isOnline: boolean;
          lastActive: ReturnType<typeof serverTimestamp>;
        }
      >
    ),
    directGuessesLeft: gameState.directGuessesLeft,
    thresholdMajority: gameState.settings.majorityThreshold,
    currentReference: gameState.currentReference
      ? {
          clueGiverId: gameState.currentReference.clueGiverId,
          referenceWord: gameState.currentReference.referenceWord,
          clue: gameState.currentReference.clue,
          guesses: gameState.currentReference.guesses,
          setterAttempt: gameState.currentReference.setterAttempt,
          isClimactic: gameState.currentReference.isClimactic,
          timestamp: serverTimestamp(),
        }
      : null,
    winner: gameState.winner,
    gameHistory: gameState.gameHistory,
    settings: gameState.settings,
    updatedAt: serverTimestamp(),
  };
};

// Game room operations
export const createRoom = async (
  roomId: RoomId,
  creatorId: PlayerId,
  username: string
): Promise<void> => {
  const initialGameState: Partial<FirestoreGameRoom> = {
    roomId,
    gamePhase: "lobby",
    secretWord: "",
    revealedCount: 1,
    clueGiverTurn: 0,
    roundNumber: 1,
    setterUid: creatorId,
    players: {
      [creatorId]: {
        name: username,
        role: "setter",
        isOnline: true,
        lastActive: serverTimestamp(),
      },
    },
  directGuessesLeft: 3,
  // Keep legacy field for compatibility; will mirror absolute count stored in settings
  thresholdMajority: 2,
    currentReference: null,
    winner: null,
    gameHistory: [`${username} created the room.`],
    settings: {
      // Default absolute required connects
      majorityThreshold: 2,
      timeLimit: 30,
      maxPlayers: 8,
      wordValidation: "strict",
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = doc(getGameRoomsCollection(), roomId);
  await setDoc(docRef, initialGameState);
};

export const joinRoom = async (
  roomId: RoomId,
  playerId: PlayerId,
  username: string
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  await updateDoc(docRef, {
    [`players.${playerId}`]: {
      name: username,
      role: "guesser",
      isOnline: true,
      lastActive: serverTimestamp(),
    },
    gameHistory: [
      ...((await getDoc(docRef)).data()?.gameHistory || []),
      `${username} joined the room.`,
    ],
    updatedAt: serverTimestamp(),
  });
};

export const leaveRoom = async (
  roomId: RoomId,
  playerId: PlayerId
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  // Get current room data to check if leaving player is the setter
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error("Room not found");
  }

  const data = docSnap.data() as FirestoreGameRoom;
  const leavingPlayer = data.players?.[playerId];
  const isLeavingPlayerSetter = data.setterUid === playerId;

  // Get remaining players after this player leaves
  const remainingPlayers = Object.entries(data.players || {})
    .filter(([id]) => id !== playerId)
    .map(([id, player]) => ({ id, ...player }));

  // Add leave message to game history
  const leaveMessage = leavingPlayer
    ? `${leavingPlayer.name} left the room.`
    : "A player left the room.";

  const newGameHistory = [...(data.gameHistory || []), leaveMessage];

  // Base update object
  const baseUpdate = {
    [`players.${playerId}`]: deleteField(),
    gameHistory: newGameHistory,
    updatedAt: serverTimestamp(),
  };

  // Handle setter leaving
  if (isLeavingPlayerSetter && remainingPlayers.length > 0) {
    // Find the first remaining player to promote to setter
    const newSetter = remainingPlayers[0];

    // Add setter change messages
    const finalGameHistory = [
      ...newGameHistory,
      `${newSetter.name} is now the word setter.`,
      "Game reset to lobby due to setter leaving.",
    ];

    // Create update with setter reassignment and game reset
    await updateDoc(docRef, {
      ...baseUpdate,
      setterUid: newSetter.id,
      [`players.${newSetter.id}.role`]: "setter",
      gamePhase: "lobby",
      secretWord: "",
      revealedCount: 1,
      clueGiverTurn: 0,
      roundNumber: 1,
      directGuessesLeft: 3,
      currentReference: null,
      winner: null,
      gameHistory: finalGameHistory,
    });
  } else {
    // Just remove the player without setter reassignment
    await updateDoc(docRef, baseUpdate);
  }
};

export const setSecretWord = async (
  roomId: RoomId,
  word: string
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  // Fetch current game history first
  const docSnap = await getDoc(docRef);
  const currentGameHistory = docSnap.data()?.gameHistory || [];

  await updateDoc(docRef, {
    secretWord: word.toUpperCase(),
    gamePhase: "guessing",
    gameHistory: [
      ...currentGameHistory,
      "The word has been set. Game started!",
    ],
    updatedAt: serverTimestamp(),
  });
};

export const setReference = async (
  roomId: RoomId,
  clueGiverId: PlayerId,
  referenceWord: string,
  clue: string
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data() as FirestoreGameRoom;

  const player = data.players?.[clueGiverId];
  if (!player) throw new Error("Clue giver not found");

  const referenceWordUpper = referenceWord.toUpperCase();
  const secretWord = data.secretWord;

  // Check if this is a climactic round (reference word equals secret word)
  const isClimactic = referenceWordUpper === secretWord;

  const historyMessage = isClimactic
    ? `${player.name} gave the clue: "${clue}" (🎯 CLIMACTIC ROUND!)`
    : `${player.name} gave the clue: "${clue}"`;

  await updateDoc(docRef, {
    currentReference: {
      clueGiverId,
      referenceWord: referenceWordUpper,
      clue,
      guesses: {},
      setterAttempt: "",
      isClimactic,
      timestamp: serverTimestamp(),
    },
    gameHistory: [...(data.gameHistory || []), historyMessage],
    updatedAt: serverTimestamp(),
  });
};

export const submitGuess = async (
  roomId: RoomId,
  playerId: PlayerId,
  guess: string
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  await runTransaction(getDb(), async (transaction) => {
    // Read current state inside transaction
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error("Room not found");

    const data = docSnap.data() as FirestoreGameRoom;
    const { players, currentReference } = data;

    // Validate that round is still active
    if (!currentReference) {
      throw new Error("ROUND_ENDED:No active reference");
    }

    const player = players?.[playerId];
    if (!player) throw new Error("Player not found");

    // Check if player already submitted a guess (idempotency)
    if (currentReference.guesses?.[playerId]) {
      // Already submitted, this is a duplicate - silently succeed
      return;
    }

    // Count current guesses and calculate threshold
    const activeGuesserIds = Object.keys(players || {}).filter(
      (id) =>
        players?.[id]?.role === "guesser" && id !== currentReference.clueGiverId
    );
    const currentGuesses = Object.keys(currentReference.guesses || {}).length;
    const majorityThreshold = Math.ceil(
      (activeGuesserIds.length * (data.thresholdMajority || 51)) / 100
    );

    // Update the guess atomically
    transaction.update(docRef, {
      [`currentReference.guesses.${playerId}`]: guess.toLowerCase(),
      gameHistory: [
        ...(data.gameHistory || []),
        {
          id: `guess_${playerId}_${Date.now()}`,
          message: `${
            majorityThreshold - (currentGuesses + 1) === 0
              ? "All connects received! Let's hope!"
              : `Connect!🤚🏻 (${activeGuesserIds.length - (currentGuesses + 1)} more needed)`
          }`,
          timestamp: new Date(),
          type: "info",
          alignment: "right",
          playerId: playerId,
        },
      ],
      updatedAt: serverTimestamp(),
    });
  });

  // Trigger resolution check after successful transaction
  await checkReferenceResolution(roomId);
};

export const submitDirectGuess = async (
  roomId: RoomId,
  playerId: PlayerId,
  guess: string
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data() as FirestoreGameRoom;

  const player = data.players?.[playerId];
  if (!player) throw new Error("Player not found");

  const guessUpper = guess.toUpperCase();
  const secretWord = data.secretWord;
  const newDirectGuessesLeft = Math.max(0, (data.directGuessesLeft || 3) - 1);

  const isCorrect = guessUpper === secretWord;
  const playerName = player.name;

  if (isCorrect) {
    // Guessers win!
    await updateDoc(docRef, {
      gamePhase: "ended",
      winner: "guessers",
      directGuessesLeft: newDirectGuessesLeft,
      gameHistory: [
        ...(data.gameHistory || []),
        `${playerName} guessed the word: ${guessUpper}!`,
      ],
      updatedAt: serverTimestamp(),
    });
  } else if (newDirectGuessesLeft <= 0) {
    // Out of guesses - setter wins!
    await updateDoc(docRef, {
      gamePhase: "ended",
      winner: "setter",
      directGuessesLeft: 0,
      gameHistory: [
        ...(data.gameHistory || []),
        `${playerName} guessed ${guessUpper}. Incorrect!`,
        "Out of guesses. Setter wins!",
      ],
      updatedAt: serverTimestamp(),
    });
  } else {
    // Incorrect guess, continue game
    await updateDoc(docRef, {
      directGuessesLeft: newDirectGuessesLeft,
      gameHistory: [
        ...(data.gameHistory || []),
        `${playerName} guessed ${guessUpper}. Incorrect!`,
        `${newDirectGuessesLeft} direct guesses left.`,
      ],
      updatedAt: serverTimestamp(),
    });
  }
};

export const updateGameSettings = async (
  roomId: RoomId,
  settings: Partial<GameSettings>
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  await updateDoc(docRef, {
    settings: settings,
    thresholdMajority: settings.majorityThreshold, // Keep legacy field for compatibility
    updatedAt: serverTimestamp(),
  });
};

export const removePlayer = async (
  roomId: RoomId,
  playerId: PlayerId
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Game room not found");
  }

  const data = docSnap.data() as FirestoreGameRoom;
  const gameState = firestoreToGameState(data);

  // Get player info before removal
  const playerToRemove = gameState.players[playerId];
  if (!playerToRemove) {
    throw new Error("Player not found");
  }

  // Calculate clue giver adjustments if removing a guesser during active gameplay
  const updateData: {
    [key: string]: unknown;
    updatedAt: ReturnType<typeof serverTimestamp>;
    clueGiverTurn?: number;
    currentReference?: null;
    gameHistory?: (
      | string
      | {
          id: string;
          message: string;
          timestamp: Date | Timestamp | FieldValue;
          type?: "info" | "success" | "warning" | "error";
          alignment?: "left" | "center" | "right";
          playerId?: string;
        }
    )[];
  } = {
    [`players.${playerId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  };

  if (playerToRemove.role === "guesser" && gameState.gamePhase === "guessing") {
    const { newClueGiverTurn, needsNewClueGiver, shouldClearReference } =
      calculateClueGiverTurnAfterRemoval(gameState, playerId);

    // Update clue giver turn
    updateData.clueGiverTurn = newClueGiverTurn;

    // Clear current reference if the clue giver left
    if (shouldClearReference) {
      updateData.currentReference = null;
    }

    // Add history messages
    const historyMessages = [`${playerToRemove.name} left the game.`];

    if (needsNewClueGiver) {
      // Get remaining guessers to find the new clue giver
      const remainingGuessers = Object.keys(gameState.players)
        .filter(
          (id) => id !== playerId && gameState.players[id].role === "guesser"
        )
        .sort();

      if (remainingGuessers.length > 0) {
        const newClueGiverId = remainingGuessers[newClueGiverTurn];
        const newClueGiver = gameState.players[newClueGiverId];
        if (newClueGiver) {
          historyMessages.push(`${newClueGiver.name} is now the clue giver.`);
        }
      }
    }

    updateData.gameHistory = [
      ...(gameState.gameHistory || []),
      ...historyMessages,
    ];
  } else {
    // For non-guesser removals or lobby phase, just add a simple message
    updateData.gameHistory = [
      ...(gameState.gameHistory || []),
      `${playerToRemove.name} left the game.`,
    ];
  }

  await updateDoc(docRef, updateData);
};

export const changeSetter = async (
  roomId: RoomId,
  newSetterId: PlayerId,
  oldSetterId: PlayerId
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  await updateDoc(docRef, {
    setterUid: newSetterId,
    [`players.${newSetterId}.role`]: "setter",
    [`players.${oldSetterId}.role`]: "guesser",
    updatedAt: serverTimestamp(),
  });
};

export const volunteerAsClueGiver = async (
  roomId: RoomId,
  playerId: PlayerId
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Game room not found");
  }

  const data = docSnap.data() as FirestoreGameRoom;
  const gameState = firestoreToGameState(data);

  // Verify player exists and is a guesser
  const player = gameState.players[playerId];
  if (!player) {
    throw new Error("Player not found");
  }
  if (player.role !== "guesser") {
    throw new Error("Only guessers can volunteer to be clue giver");
  }

  if (gameState.gamePhase !== "guessing") {
    throw new Error("Can only volunteer during guessing phase");
  }
  // Get ordered guesser list to find the new clue giver turn index
  const orderedGuesserIds = Object.keys(gameState.players)
    .filter((id) => gameState.players[id].role === "guesser")
    .sort();

  const volunteerIndex = orderedGuesserIds.indexOf(playerId);
  if (volunteerIndex === -1) {
    throw new Error("Volunteer not found in guesser list");
  }

  // Update clue giver turn to point to the volunteer
  const historyMessage = `${player.name} volunteered to be the clue giver.`;

  await updateDoc(docRef, {
    clueGiverTurn: volunteerIndex,
    currentReference: null, // Clear any existing reference
    gameHistory: [...(gameState.gameHistory || []), historyMessage],
    updatedAt: serverTimestamp(),
  });
};

export const startGameRound = async (roomId: RoomId): Promise<void> => {
  const gameRef = doc(getGameRoomsCollection(), roomId);

  await updateDoc(gameRef, {
    gamePhase: "setting_word",
    updatedAt: serverTimestamp(),
  });
};

// Real-time subscription
export const subscribeToGameRoom = (
  roomId: RoomId,
  callback: (gameState: GameState | null) => void
): Unsubscribe => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  return onSnapshot(
    docRef,
    (doc) => {
      if (doc.exists()) {
        const data = doc.data() as FirestoreGameRoom;
        const gameState = firestoreToGameState(data);
        callback(gameState);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error listening to game room:", error);
      callback(null);
    }
  );
};

// Utility functions
export const generateRoomCode = (): string => {
  // Use consonants and vowels for easier pronunciation/memorization
  // Exclude confusing characters: I/L (looks like 1), O (looks like 0)
  const consonants = "BCDFGHJKMNPQRSTVWXYZ"; // Removed L
  const vowels = "AEUY"; // Removed I and O
  const numbers = "23456789"; // Removed 0 and 1
  
  let result = "";
  
  // Generate pattern: C-V-C-V-N-N (Consonant-Vowel-Consonant-Vowel-Number-Number)
  // This creates pronounceable-ish codes like "TAKE42" or "PUFE73"
  result += consonants.charAt(Math.floor(Math.random() * consonants.length));
  result += vowels.charAt(Math.floor(Math.random() * vowels.length));
  result += consonants.charAt(Math.floor(Math.random() * consonants.length));
  result += vowels.charAt(Math.floor(Math.random() * vowels.length));
  result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  return result;
};

export const submitSetterGuess = async (
  roomId: RoomId,
  setterId: PlayerId,
  guess: string
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  let shouldResolve = false;
  const guessLower = guess.toLowerCase();

  await runTransaction(getDb(), async (transaction) => {
    // Read current state inside transaction
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error("Room not found");

    const data = docSnap.data() as FirestoreGameRoom;
    const currentReference = data.currentReference;

    // Validate that round is still active
    if (!currentReference) {
      throw new Error("ROUND_ENDED:No active reference");
    }

    const referenceWord = currentReference.referenceWord.toLowerCase();

    if (guessLower === referenceWord) {
      // Setter guessed correctly - update and flag for resolution
      transaction.update(docRef, {
        "currentReference.setterAttempt": guessLower,
        updatedAt: serverTimestamp(),
      });
      shouldResolve = true;
    } else {
      // Incorrect guess - just log it
      const setter = Object.values(data.players || {}).find(
        (p) => p.role === "setter"
      );
      transaction.update(docRef, {
        gameHistory: [
          ...(data.gameHistory || []),
          `${setter?.name || "Setter"} incorrectly guessed '${guess}'.`,
        ],
        updatedAt: serverTimestamp(),
      });
    }
  });

  // Trigger resolution if setter guessed correctly
  if (shouldResolve) {
    await checkReferenceResolution(roomId);
  }
};

export const returnToLobby = async (roomId: RoomId): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Room not found");
  }

  const data = docSnap.data() as FirestoreGameRoom;

  // Reset game state back to lobby
  await updateDoc(docRef, {
    gamePhase: "lobby",
    secretWord: "",
    revealedCount: 1,
    clueGiverTurn: 0,
    roundNumber: (data.roundNumber || 1) + 1,
    directGuessesLeft: 3,
    currentReference: null,
    winner: null,
    gameHistory: [
      ...(data.gameHistory || []),
      "Game ended. Returned to lobby for next round.",
    ],
    updatedAt: serverTimestamp(),
  });
};

export const checkReferenceResolution = async (
  roomId: RoomId
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  await runTransaction(getDb(), async (transaction) => {
    // Read current state inside transaction
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data() as FirestoreGameRoom;
    const { currentReference, players, secretWord, clueGiverTurn } = data;

    // Check if reference still exists (may have been resolved already)
    if (!currentReference) return;

    const guesserIds = Object.keys(players || {})
      .filter((id) => players?.[id]?.role === "guesser")
      .sort();
    const nextTurn =
      guesserIds.length > 0 ? ((clueGiverTurn || 0) + 1) % guesserIds.length : 0;
    const setterName =
      Object.values(players || {}).find((p) => p.role === "setter")?.name ||
      "Setter";

    // Handle climactic rounds specially
    if (currentReference.isClimactic) {
      const activeGuesserIds = guesserIds.filter(
        (id) => id !== currentReference.clueGiverId
      );
      if (activeGuesserIds.length === 0) return;

      const guesses = currentReference.guesses || {};
      const guessedCount = activeGuesserIds.filter((id) => guesses[id]).length;
      const majorityPercentage = data.thresholdMajority || 51;
      const majorityThreshold = Math.ceil(
        activeGuesserIds.length * (majorityPercentage / 100)
      );

      if (guessedCount >= majorityThreshold) {
        // In climactic rounds, guessers always win regardless of their actual guesses
        transaction.update(docRef, {
          gamePhase: "ended",
          winner: "guessers",
          revealedCount: secretWord.length, // Reveal the entire word
          gameHistory: [
            ...(data.gameHistory || []),
            "🎉 The reference word IS the secret word! Guessers Won! 🎉",
          ],
          updatedAt: serverTimestamp(),
        });
      }
      return; // Exit early for climactic rounds
    }

    // Normal (non-climactic) resolution logic
    if (
      currentReference.setterAttempt &&
      currentReference.setterAttempt ===
        currentReference.referenceWord.toLowerCase()
    ) {
      transaction.update(docRef, {
        currentReference: null,
        clueGiverTurn: nextTurn,
        gameHistory: [
          ...(data.gameHistory || []),
          `${setterName} guessed '${currentReference.referenceWord}'! Round failed.`,
        ],
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const activeGuesserIds = guesserIds.filter(
      (id) => id !== currentReference.clueGiverId
    );
    if (activeGuesserIds.length === 0) return;

    const guesses = currentReference.guesses || {};
    const guessedCount = activeGuesserIds.filter((id) => guesses[id]).length;
    // Prefer absolute from settings; fallback to legacy percent
    const rawAbs2 = data.settings?.majorityThreshold;
    const legacyPercent2 = data.thresholdMajority;
    const interpretedThreshold2 =
      typeof rawAbs2 === "number"
        ? rawAbs2
        : typeof legacyPercent2 === "number"
        ? Math.ceil(Math.max(activeGuesserIds.length, 1) * (legacyPercent2 / 100))
        : 2;
    const majorityThreshold = Math.max(
      1,
      Math.min(interpretedThreshold2, Math.max(activeGuesserIds.length, 1))
    );

    // Group guesses by their value to find matches
    const guessGroups: Record<string, string[]> = {};
    activeGuesserIds.forEach((id) => {
      const guess = guesses[id];
      if (guess) {
        if (!guessGroups[guess]) {
          guessGroups[guess] = [];
        }
        guessGroups[guess].push(id);
      }
    });

    // Find the largest group of matching guesses
    const largestGroup = Object.values(guessGroups).reduce(
      (largest, current) => (current.length > largest.length ? current : largest),
      []
    );

    // Check if the largest group meets the threshold and matches the reference word
    if (largestGroup.length >= majorityThreshold) {
      const matchingGuess = Object.keys(guessGroups).find(
        (guess) => guessGroups[guess] === largestGroup
      );

      if (
        matchingGuess &&
        matchingGuess.toLowerCase() ===
          currentReference.referenceWord.toLowerCase()
      ) {
        const newRevealedCount = (data.revealedCount || 1) + 1;
        const nextLetter = secretWord[data.revealedCount || 1];

        if (newRevealedCount >= secretWord.length) {
          // All letters revealed - guessers win!
          transaction.update(docRef, {
            gamePhase: "ended",
            winner: "guessers",
            revealedCount: secretWord.length,
            gameHistory: [
              ...(data.gameHistory || []),
              {
                id: `connect_success_${Date.now()}`,
                message: `✅ All connected on "${currentReference.referenceWord}" - All letters revealed! Guessers win!`,
                timestamp: new Date(),
                type: "success",
                alignment: "center",
              },
            ],
            updatedAt: serverTimestamp(),
          });
        } else {
          // Reveal next letter
          transaction.update(docRef, {
            revealedCount: newRevealedCount,
            currentReference: null,
            clueGiverTurn: nextTurn,
            gameHistory: [
              ...(data.gameHistory || []),
              {
                id: `connect_success_${Date.now()}`,
                message: `✅ All connected on "${currentReference.referenceWord}" - Revealed '${nextLetter}'. (${largestGroup.length}/${activeGuesserIds.length} guessers agreed)`,
                timestamp: new Date(),
                type: "success",
                alignment: "center",
              },
            ],
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        // Majority reached but guess was incorrect - fail immediately
        const failureMessage = `Majority agreed on incorrect guess. (${largestGroup.length}/${activeGuesserIds.length} guessers agreed)`;

        transaction.update(docRef, {
          currentReference: null,
          clueGiverTurn: nextTurn,
          gameHistory: [...(data.gameHistory || []), failureMessage],
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      // Check if all active guessers have submitted their guesses
      if (guessedCount >= activeGuesserIds.length) {
        // All guesses received but no majority consensus - fail
        const failureMessage = `No majority consensus reached. (${guessedCount}/${activeGuesserIds.length} submitted, ${majorityThreshold} needed)`;

        transaction.update(docRef, {
          currentReference: null,
          clueGiverTurn: nextTurn,
          gameHistory: [...(data.gameHistory || []), failureMessage],
          updatedAt: serverTimestamp(),
        });
      }
      // If not all guesses received yet, wait for remaining guesses
      // The UI will show progress: "Connect!🤚🏻 (X more needed)" from submitGuess function
    }
  });
};

// Feedback and Survey functions
export const submitFeedback = async (feedbackData: {
  category: string;
  message: string;
  createdAt: Date;
  userAgent: string;
  gamePhase: string;
  roomId: string | null;
  userId: string | null;
  sessionId: string;
}): Promise<void> => {
  const feedbackRef = doc(
    collection(getDb(), "feedback_detailed"),
    generateUUID()
  );
  await setDoc(feedbackRef, feedbackData);
};

export const submitSatisfactionSurvey = async (surveyData: {
  roomId: string | null;
  roundNumber: number;
  winner: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
  userId: string | null;
  sessionId: string;
}): Promise<void> => {
  const surveyRef = doc(collection(getDb(), "round_feedback"), generateUUID());
  await setDoc(surveyRef, surveyData);
};

// Utility function to generate UUID
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const checkRoomExists = async (roomId: RoomId): Promise<boolean> => {
  try {
    const docRef = doc(getGameRoomsCollection(), roomId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking room existence:", error);
    return false;
  }
};
