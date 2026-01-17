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
  arrayUnion,
  addDoc,
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
  FirestoreReferenceEntry,
  FirestoreReferenceState,
  GameWinner,
  RoundArchiveSnapshot,
  ArchivedReferenceState,
  ArchivedPlayerSummary,
} from "../types";

// Collection reference getter
const getGameRoomsCollection = () => collection(getDb(), "game_rooms");
const getRoundArchivesCollection = (roomId: RoomId) =>
  collection(getDb(), "game_rooms", roomId, "round_archives");

const buildReferenceStateArchive = (
  refState?: FirestoreReferenceState
): ArchivedReferenceState => {
  if (!refState) {
    return {
      order: [],
      activeIndex: null,
      itemsById: {},
    };
  }

  const items = Object.entries(refState.itemsById || {}).reduce(
    (acc, [refId, entry]) => {
      acc[refId] = {
        ...entry,
        connects: entry.connects ?? [],
        guesses: entry.guesses ?? {},
        resolvedAt: entry.resolvedAt ?? null,
      };
      return acc;
    },
    {} as ArchivedReferenceState["itemsById"]
  );

  return {
    order: [...(refState.order || [])],
    activeIndex:
      typeof refState.activeIndex === "number" ? refState.activeIndex : null,
    itemsById: items,
  };
};

const archiveCurrentRound = async (
  roomId: RoomId,
  data: FirestoreGameRoom
): Promise<void> => {
  const secretWord = (data.secretWord || "").trim();
  const hasReferenceData = Boolean(
    data.referenceState &&
      ((data.referenceState.order?.length ?? 0) > 0 ||
        Object.keys(data.referenceState.itemsById || {}).length > 0)
  );

  if (!secretWord && !hasReferenceData) {
    return;
  }

  const playerList: ArchivedPlayerSummary[] = Object.entries(
    data.players || {}
  ).map(([id, player]) => ({
    id,
    role: player.role,
    name: player.name,
  }));

  const archiveDoc: RoundArchiveSnapshot = {
    archiveId: generateUUID(),
    roundId: `round_${data.roundNumber || 1}`,
    roomId: data.roomId,
    secretWord,
    playMode: data.settings?.playMode ?? "round_robin",
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt : serverTimestamp(),
    completedAt: serverTimestamp(),
    winner: data.winner ?? null,
    playerList,
    referenceState: buildReferenceStateArchive(data.referenceState),
  };

  await addDoc(getRoundArchivesCollection(roomId), archiveDoc);
};

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
          isFinal: data.currentReference.isFinal || false,
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
      connectsRequired: data.settings?.connectsRequired ?? 1, // Default to 1 for backward compatibility
      playMode: data.settings?.playMode ?? "round_robin", // Default to round_robin for backward compatibility
    },
    clueGiverTurn: data.clueGiverTurn || 0,
    roundNumber: data.roundNumber || 1,
    setterUid: data.setterUid,
    winner: data.winner,
    gameHistory: data.gameHistory || [],
    // Convert referenceState from Firestore to client format
    referenceState: data.referenceState
      ? {
          order: data.referenceState.order || [],
          activeIndex: data.referenceState.activeIndex,
          itemsById: Object.entries(data.referenceState.itemsById || {}).reduce(
            (acc, [id, entry]) => {
              acc[id] = {
                ...entry,
                timestamp:
                  entry.timestamp instanceof Timestamp
                    ? entry.timestamp.toDate()
                    : new Date(),
                resolvedAt: entry.resolvedAt
                  ? entry.resolvedAt instanceof Timestamp
                    ? entry.resolvedAt.toDate()
                    : entry.resolvedAt
                  : undefined,
                connects: entry.connects?.map((connect) => ({
                  playerId: connect.playerId,
                  role: connect.role,
                  guess: connect.guess,
                  timestamp:
                    connect.timestamp instanceof Timestamp
                      ? connect.timestamp.toDate()
                      : new Date(),
                })),
              };
              return acc;
            },
            {} as Record<string, import("../types").ReferenceEntry>
          ),
        }
      : {
          // Default empty state for backward compatibility
          order: [],
          activeIndex: data.settings?.playMode === "round_robin" ? 0 : null,
          itemsById: {},
        },
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
          isFinal: gameState.currentReference.isFinal,
          timestamp: serverTimestamp(),
        }
      : null,
    // Serialize referenceState to Firestore format
    referenceState: gameState.referenceState
      ? {
          order: gameState.referenceState.order,
          activeIndex: gameState.referenceState.activeIndex,
          itemsById: Object.entries(gameState.referenceState.itemsById).reduce(
            (acc, [id, entry]) => {
              acc[id] = {
                ...entry,
                timestamp: serverTimestamp(),
                resolvedAt: entry.resolvedAt ? serverTimestamp() : undefined,
                connects: entry.connects?.map((connect) => ({
                  playerId: connect.playerId,
                  role: connect.role,
                  guess: connect.guess,
                  timestamp: serverTimestamp(),
                })),
              };
              return acc;
            },
            {} as Record<string, import("../types").FirestoreReferenceEntry>
          ),
        }
      : undefined,
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
    // Initialize empty referenceState
    referenceState: {
      order: [],
      activeIndex: null, // Will be initialized when game starts
      itemsById: {},
    },
    winner: null,
    gameHistory: [`Room created by ${username}`],
    settings: {
      // Default absolute required connects
      majorityThreshold: 2,
      timeLimit: 30,
      maxPlayers: 8,
      wordValidation: "strict",
      connectsRequired: 1, // Default number of connections required
      playMode: "round_robin", // Default play mode
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
      `${username} joined`,
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
    ? `${leavingPlayer.name} left`
    : "A player left";

  const newGameHistory = [...(data.gameHistory || []), leaveMessage];

  // Base update object
  const baseUpdate = {
    [`players.${playerId}`]: deleteField(),
    gameHistory: newGameHistory,
    updatedAt: serverTimestamp(),
  };

  if (isLeavingPlayerSetter) {
    await archiveCurrentRound(roomId, data);

    if (remainingPlayers.length > 0) {
      // Find the first remaining player to promote to setter
      const newSetter = remainingPlayers[0];

      // Add setter change messages
      const finalGameHistory = [
        ...newGameHistory,
        "Game reset to lobby (setter left)",
        `${newSetter.name} is now the setter`,
      ];

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
        referenceState: {
          order: [],
          activeIndex: data.settings?.playMode === "round_robin" ? 0 : null,
          itemsById: {},
        },
        winner: null,
        gameHistory: finalGameHistory,
      });
    } else {
      await updateDoc(docRef, baseUpdate);
    }
  } else {
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
  const data = docSnap.data() as FirestoreGameRoom;

  // Get setter name
  const setter = Object.values(data.players || {}).find(
    (p) => p.role === "setter"
  );
  const setterName = setter?.name || "Setter";

  await updateDoc(docRef, {
    secretWord: word.toUpperCase(),
    gamePhase: "guessing",
    gameHistory: [
      ...currentGameHistory,
      `${setterName} has set the secret word`,
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
  // Delegate to new createReference function - using the existing API
  await createReference(roomId, clueGiverId, referenceWord, clue);
};

export const submitConnect = async (
  roomId: RoomId,
  playerId: PlayerId,
  connectWord: string,
  refId?: string // Optional: specific reference to connect on (required for signull)
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  let targetRefId: string = "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await runTransaction(getDb(), async (transaction: any) => {
    // Read current state inside transaction
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error("Room not found");

    const data = docSnap.data() as FirestoreGameRoom;
    const playMode = data.settings?.playMode || "round_robin";
    const refState = data.referenceState;

    // Get player info to determine role
    const player = data.players?.[playerId];
    if (!player) throw new Error("Player not found");

    const playerRole = player.role; // 'guesser' | 'setter'

    // Determine target reference
    if (playMode === "round_robin") {
      // Use active reference
      if (!refState || refState.activeIndex === null) {
        throw new Error("No active reference");
      }
      targetRefId = refState.order[refState.activeIndex];
    } else {
      // signull mode - must provide refId
      if (!refId) throw new Error("Reference ID required for signull mode");
      targetRefId = refId;
    }

    const targetRef = refState?.itemsById[targetRefId];
    if (!targetRef || targetRef.status !== "pending") {
      throw new Error("ROUND_ENDED:No active reference");
    }

    // Check idempotency - only for guessers; allow setter to submit multiple attempts
    if (playerRole === "guesser") {
      const existingConnect = targetRef.connects?.find(
        (c) => c.playerId === playerId
      );
      if (existingConnect) {
        return; // Already submitted
      }
    }

    // Create new connect entry - use Date.now() for timestamp since serverTimestamp()
    // cannot be used inside arrayUnion()
    const connectEntry = {
      playerId,
      role: playerRole,
      guess: connectWord.toUpperCase(),
      timestamp: Date.now(),
    };

    // Create history entry with Date.now() as well
    const historyEntry = {
      id: `connect_${playerId}_${Date.now()}`,
      message:
        playerRole === "setter"
          ? `${player.name} tried ${connectWord.toUpperCase()}`
          : `${player.name} raised a connect!`,
      timestamp: Date.now(),
      type: "info",
      alignment: "right",
      playerId: playerId,
    };

    // Update connect in array using arrayUnion
    transaction.update(docRef, {
      [`referenceState.itemsById.${targetRefId}.connects`]:
        arrayUnion(connectEntry),
      // Also update currentReference for backward compat
      ...(playerRole === "guesser"
        ? {
            [`currentReference.guesses.${playerId}`]: connectWord.toLowerCase(),
            [`referenceState.itemsById.${targetRefId}.guesses.${playerId}`]:
              connectWord.toLowerCase(),
          }
        : {
            [`currentReference.setterAttempt`]: connectWord.toLowerCase(),
            [`referenceState.itemsById.${targetRefId}.setterAttempt`]:
              connectWord.toLowerCase(),
          }),
      gameHistory: arrayUnion(historyEntry),
      updatedAt: serverTimestamp(),
    });
  });

  // Trigger resolution check
  if (targetRefId) {
    await checkReferenceResolution(roomId, targetRefId);
  }
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
        `${playerName} guessed it: ${guessUpper}!`,
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
        `${playerName} tried ${guessUpper} (incorrect)`,
        "No guesses left → Setter wins!",
      ],
      updatedAt: serverTimestamp(),
    });
  } else {
    // Incorrect guess, continue game
    const guessPlural = newDirectGuessesLeft > 1 ? "guesses" : "guess";
    await updateDoc(docRef, {
      directGuessesLeft: newDirectGuessesLeft,
      gameHistory: [
        ...(data.gameHistory || []),
        `${playerName} tried ${guessUpper} (incorrect)`,
        `${newDirectGuessesLeft} direct ${guessPlural} remaining`,
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
  // Validate inputs
  if (!playerId || typeof playerId !== "string" || playerId.trim() === "") {
    throw new Error("Invalid player ID");
  }
  if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
    throw new Error("Invalid room ID");
  }

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
    const historyMessages = [`${playerToRemove.name} left during game`];

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
          historyMessages.push(`${newClueGiver.name} is now giving clues`);
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
      `${playerToRemove.name} left`,
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
  const historyMessage = `${player.name} volunteered as clue giver`;

  await updateDoc(docRef, {
    clueGiverTurn: volunteerIndex,
    // Don't need to clear entire state, just set currentReference to null
    // referenceState will handle active references properly
    currentReference: null,
    gameHistory: [...(gameState.gameHistory || []), historyMessage],
    updatedAt: serverTimestamp(),
  });
};

export const startGameRound = async (roomId: RoomId): Promise<void> => {
  const gameRef = doc(getGameRoomsCollection(), roomId);
  const docSnap = await getDoc(gameRef);

  if (!docSnap.exists()) {
    throw new Error("Game room not found");
  }

  const data = docSnap.data() as FirestoreGameRoom;
  const playMode = data.settings?.playMode || "round_robin";

  await updateDoc(gameRef, {
    gamePhase: "setting_word",
    // Initialize referenceState if not present
    referenceState: data.referenceState || {
      order: [],
      activeIndex: playMode === "round_robin" ? 0 : null,
      itemsById: {},
    },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc: any) => {
      if (doc.exists()) {
        const data = doc.data() as FirestoreGameRoom;
        const gameState = firestoreToGameState(data);
        callback(gameState);
      } else {
        callback(null);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error: any) => {
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

/**
 * Generate a unique reference ID
 * Format: ref_<timestamp>_<random>
 */
export const generateReferenceId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ref_${timestamp}_${random}`;
};

/**
 * Atomically create a new reference entry in both modes
 * @param roomId - The room ID
 * @param clueGiverId - The player ID of the clue giver
 * @param referenceWord - The reference word
 * @param clue - The clue text
 * @returns The generated reference ID
 */
export const createReference = async (
  roomId: RoomId,
  clueGiverId: PlayerId,
  referenceWord: string,
  clue: string
): Promise<string> => {
  const docRef = doc(getGameRoomsCollection(), roomId);
  const refId = generateReferenceId();

  await runTransaction(getDb(), async (transaction) => {
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) throw new Error("Room not found");

    const data = docSnap.data() as FirestoreGameRoom;
    const player = data.players?.[clueGiverId];
    if (!player) throw new Error("Clue giver not found");

    const referenceWordUpper = referenceWord.toUpperCase();
    const secretWord = data.secretWord;
    const isFinal = referenceWordUpper === secretWord;
    const playMode = data.settings?.playMode || "round_robin";

    // Get current reference state
    const currentRefState = data.referenceState || {
      order: [],
      activeIndex: playMode === "round_robin" ? 0 : null,
      itemsById: {},
    };

    // Create new reference entry
    const newEntry: FirestoreReferenceEntry = {
      id: refId,
      clueGiverId,
      referenceWord: referenceWordUpper,
      clue,
      connects: [], // New connects array for Phase 2
      guesses: {}, // Keep for backward compatibility during Phase 2-3
      setterAttempt: "", // Keep for backward compatibility during Phase 2-3
      isFinal,
      timestamp: serverTimestamp(),
      status: "pending",
    };

    // Calculate new activeIndex for round_robin
    const newActiveIndex =
      playMode === "round_robin"
        ? currentRefState.order.length // Points to the newly added reference
        : null;

    const historyMessage = isFinal
      ? `${player.name}: "${clue}" [FINAL ROUND]`
      : `${player.name}: "${clue}"`;

    // Transactional update using deep paths
    transaction.update(docRef, {
      // Append to order array
      "referenceState.order": arrayUnion(refId),
      // Set the entry in itemsById
      [`referenceState.itemsById.${refId}`]: newEntry,
      // Update activeIndex (for round_robin only, null for signull)
      "referenceState.activeIndex": newActiveIndex,
      // Keep currentReference in sync for backward compatibility
      currentReference: {
        id: refId,
        clueGiverId,
        referenceWord: referenceWordUpper,
        clue,
        guesses: {},
        connects: [],
        setterAttempt: "",
        isFinal,
        timestamp: serverTimestamp(),
      },
      gameHistory: arrayUnion(historyMessage),
      updatedAt: serverTimestamp(),
    });
  });

  return refId;
};

export const submitSetterGuess = async (
  roomId: RoomId,
  setterId: PlayerId,
  guess: string
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  let shouldResolve = false;
  const guessLower = guess.toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await runTransaction(getDb(), async (transaction: any) => {
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
          `${setter?.name || "Setter"} guessed '${guess}' (incorrect)`,
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

  await archiveCurrentRound(roomId, data);

  // Reset game state back to lobby
  await updateDoc(docRef, {
    gamePhase: "lobby",
    secretWord: "",
    revealedCount: 1,
    clueGiverTurn: 0,
    roundNumber: (data.roundNumber || 1) + 1,
    directGuessesLeft: 3,
    currentReference: null,
    referenceState: {
      order: [],
      activeIndex: data.settings?.playMode === "round_robin" ? 0 : null,
      itemsById: {},
    },
    winner: null,
    gameHistory: [
      ...(data.gameHistory || []),
      "Returned to lobby for next round",
    ],
    updatedAt: serverTimestamp(),
  });
};

// ==================== Reference Resolution Helpers ====================

/**
 * Get the active reference for round_robin mode
 * Returns null if no active reference
 */
const getActiveReferenceRR = (
  refState: FirestoreReferenceState | undefined
): FirestoreReferenceEntry | null => {
  if (!refState || refState.activeIndex === null) return null;

  const refId = refState.order[refState.activeIndex];
  if (!refId) return null;

  const entry = refState.itemsById[refId];
  return entry && entry.status === "pending" ? entry : null;
};

/**
 * Get a specific reference by ID (used in signull mode)
 */
const getReferenceById = (
  refState: FirestoreReferenceState | undefined,
  refId: string
): FirestoreReferenceEntry | null => {
  if (!refState) return null;
  return refState.itemsById[refId] || null;
};

/**
 * Calculate next activeIndex for round_robin after resolution
 */
const advanceRoundRobinIndex = (
  currentIndex: number,
  guesserCount: number
): number => {
  return guesserCount > 0 ? (currentIndex + 1) % guesserCount : 0;
};

interface ResolutionOutcome {
  type: "success" | "failed" | "pending";
  reason: string;
  newRevealedCount?: number;
  messages: (
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
  isGameEnd?: boolean;
  winner?: GameWinner;
}

/**
 * Calculate resolution outcome based on connects
 */
const calculateResolution = (
  targetRef: FirestoreReferenceEntry,
  data: FirestoreGameRoom
): ResolutionOutcome => {
  const connectsRequired = data.settings?.connectsRequired || 2;
  const connects = targetRef.connects || [];
  const referenceWord = targetRef.referenceWord;
  const secretWord = data.secretWord;

  // Sort connects by timestamp
  const sortedConnects = [...connects].sort((a, b) => {
    const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : 0;
    const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : 0;
    return timeA - timeB;
  });

  let correctConnectsCount = 0;

  // Check each connect
  for (const connect of sortedConnects) {
    // Setter block: If setter guesses the reference word correctly before the team
    if (
      connect.role === "setter" &&
      connect.guess.toLowerCase() === referenceWord.toLowerCase()
    ) {
      return {
        type: "failed",
        reason: `Setter guessed the reference word correctly before the team`,
        messages: [
          {
            id: `setter_block_${Date.now()}`,
            message: `Setter blocked with '${referenceWord}' → Round failed`,
            timestamp: new Date(),
            type: "error",
            alignment: "center",
          },
        ],
      };
    } else if (connect.role === "guesser") {
      // Count correct guesser connects
      if (connect.guess.toLowerCase() === referenceWord.toLowerCase()) {
        correctConnectsCount++;
      }
    }
  }

  // Get total active guessers (excluding clue giver)
  const guesserIds = Object.keys(data.players || {}).filter(
    (id) => data.players?.[id]?.role === "guesser"
  );
  const activeGuesserIds = guesserIds.filter(
    (id) => id !== targetRef.clueGiverId
  );
  const totalActiveGuessers = activeGuesserIds.length;

  // For final rounds, any correct connect wins
  if (targetRef.isFinal && correctConnectsCount > 0) {
    return {
      type: "success",
      reason: `${correctConnectsCount} Connects were correct. Reference Word: ${referenceWord}`,
      newRevealedCount: secretWord.length,
      isGameEnd: true,
      winner: "guessers",
      messages: [
        {
          id: `final_round_success_${Date.now()}`,
          message: `Final round hit! Guessers win!`,
          timestamp: new Date(),
          type: "success",
          alignment: "center",
        },
      ],
    };
  }

  // Check if required connects met
  if (correctConnectsCount >= connectsRequired) {
    const newRevealedCount = (data.revealedCount || 1) + 1;
    const isGameEnd = newRevealedCount >= secretWord.length;

    return {
      type: "success",
      reason: `${correctConnectsCount} correctly connected with Reference Word: ${referenceWord}`,
      newRevealedCount,
      isGameEnd,
      winner: isGameEnd ? "guessers" : undefined,
      messages: [
        {
          id: `all_connections_in_${Date.now()}`,
          message: "All connections in! Resolving in 3...2...1!",
          timestamp: new Date(),
          type: "info",
          alignment: "center",
        },
        {
          id: `connect_success_${Date.now()}`,
          message: isGameEnd
            ? `Connected on "${referenceWord}" → Word complete! Guessers win!`
            : `Connected on "${referenceWord}" → Revealed '${secretWord[data.revealedCount || 1]}' (${correctConnectsCount}/${totalActiveGuessers})`,
          timestamp: new Date(),
          type: "success",
          alignment: "center",
        },
      ],
    };
  }

  // Count total guesser connects
  const totalGuesserConnectsCount = connects.filter(
    (connect) => connect.role === "guesser"
  ).length;

  // All guessers have connected but not enough correct
  if (totalGuesserConnectsCount >= totalActiveGuessers) {
    return {
      type: "failed",
      reason: "Required number of correct connects weren't made",
      messages: [
        {
          id: `all_connections_in_${Date.now()}`,
          message: "All connections in! Resolving in 3...2...1!",
          timestamp: new Date(),
          type: "info",
          alignment: "center",
        },
        {
          id: `connect_failed_${Date.now()}`,
          message: `No consensus (${totalGuesserConnectsCount}/${totalActiveGuessers} submitted, ${connectsRequired} needed)`,
          timestamp: new Date(),
          type: "error",
          alignment: "center",
        },
      ],
    };
  }

  // Still waiting for more connects
  return {
    type: "pending",
    reason: `Just ${connectsRequired - correctConnectsCount} more required!`,
    messages: [],
  };
};

export const checkReferenceResolution = async (
  roomId: RoomId,
  refId?: string // Optional: specific reference to resolve (for signull)
): Promise<void> => {
  const docRef = doc(getGameRoomsCollection(), roomId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await runTransaction(getDb(), async (transaction: any) => {
    // 1. Read document
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data() as FirestoreGameRoom;
    const playMode = data.settings?.playMode || "round_robin";
    const refState = data.referenceState;

    // 2. Get target reference based on mode
    let targetRef: FirestoreReferenceEntry | null;
    let targetRefId: string | null;

    if (playMode === "round_robin") {
      targetRef = getActiveReferenceRR(refState);
      targetRefId = targetRef?.id || null;
    } else {
      // signull mode - must provide refId
      if (!refId) return;
      targetRef = getReferenceById(refState, refId);
      targetRefId = refId;
    }

    if (!targetRef || !targetRefId) {
      return;
    }

    // 3. Check resolution conditions (majority, setter block, etc.)
    const resolutionOutcome = calculateResolution(targetRef, data);

    // 4. Update based on outcome
    if (resolutionOutcome.type === "success") {
      // Get guesser count for round robin advancement
      const guesserIds = Object.keys(data.players || {}).filter(
        (id) => data.players?.[id]?.role === "guesser"
      );
      const guesserCount = guesserIds.length;

      // Mark as resolved, update game state
      transaction.update(docRef, {
        [`referenceState.itemsById.${targetRefId}.status`]: "resolved",
        [`referenceState.itemsById.${targetRefId}.resolvedAt`]:
          serverTimestamp(),
        revealedCount: resolutionOutcome.newRevealedCount,
        "referenceState.activeIndex":
          playMode === "round_robin" &&
          refState?.activeIndex !== null &&
          refState
            ? advanceRoundRobinIndex(refState.activeIndex, guesserCount)
            : null,
        // Clear currentReference for backward compat
        currentReference: null,
        gameHistory: arrayUnion(...resolutionOutcome.messages),
        // Check for game end conditions
        gamePhase: resolutionOutcome.isGameEnd ? "ended" : data.gamePhase,
        winner: resolutionOutcome.winner || data.winner,
        // Advance clue giver turn for round robin
        clueGiverTurn:
          playMode === "round_robin"
            ? ((data.clueGiverTurn || 0) + 1) % Math.max(guesserCount, 1)
            : data.clueGiverTurn,
        updatedAt: serverTimestamp(),
      });
    } else if (resolutionOutcome.type === "failed") {
      // Get guesser count for round robin advancement
      const guesserIds = Object.keys(data.players || {}).filter(
        (id) => data.players?.[id]?.role === "guesser"
      );
      const guesserCount = guesserIds.length;

      // Mark as failed, advance turn
      transaction.update(docRef, {
        [`referenceState.itemsById.${targetRefId}.status`]: "failed",
        [`referenceState.itemsById.${targetRefId}.resolvedAt`]:
          serverTimestamp(),
        "referenceState.activeIndex":
          playMode === "round_robin" &&
          refState?.activeIndex !== null &&
          refState
            ? advanceRoundRobinIndex(refState.activeIndex, guesserCount)
            : null,
        currentReference: null,
        gameHistory: arrayUnion(...resolutionOutcome.messages),
        // Advance clue giver turn for round robin
        clueGiverTurn:
          playMode === "round_robin"
            ? ((data.clueGiverTurn || 0) + 1) % Math.max(guesserCount, 1)
            : data.clueGiverTurn,
        updatedAt: serverTimestamp(),
      });
    }
    // If pending, do nothing - wait for more connects
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
