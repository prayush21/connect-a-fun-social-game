# Signull App: Technical Walkthrough

## User Opens App → Multiple Players Playing in Real-Time

This document traces the complete user journey through the Signull frontend application, covering architecture, state management, Firebase integration, and real-time synchronization mechanisms.

---

## 1. USER OPENS APP: Entry Point & Authentication

### 1.1 Application Bootstrap

**File Flow:**

```
App Opens
  ↓
RootLayout (src/app/layout.tsx)
  ↓
AuthProvider (src/components/auth-provider.tsx)
  ↓
App redirects to /beta (src/app/page.tsx)
  ↓
BetaLayout + BetaHomeContent (src/app/beta/page.tsx)
```

### 1.2 Layout Structure

**RootLayout** wraps the entire app:

- Sets metadata (favicon, title: "Signull | Collaborative Word Game")
- Applies global CSS and custom font (Bricolage Grotesque)
- Enforces non-scalable viewport for consistent mobile experience
- Wraps children with `AuthProvider`

### 1.3 Authentication Initialization

**AuthProvider:**

```typescript
// src/components/auth-provider.tsx
useStore((state) => state.initAuth); // Calls Firebase anonymous auth
```

**Firebase Anonymous Auth:**

```typescript
// src/lib/firebase/config.ts
export const initializeAuth = async (): Promise<string> => {
  const auth = getAuth();
  const result = await signInAnonymously(auth);
  return result.user.uid; // Returns Firebase UID
};
```

**Flow:**

1. AuthProvider calls `initAuth()` on mount
2. Firebase anonymous auth initializes
3. Returns unique user ID (sessionId/userId)
4. Zustand store persists this ID

### 1.4 State Management Layer

**Zustand Store** (src/lib/store.ts and src/lib/beta/store.ts):

Two versions exist:

- **Main store** (store.ts) - Legacy implementation
- **Beta store** (beta/store.ts) - Current production version (schema v2)

**Beta Store Structure:**

```typescript
interface BetaStoreState {
  // Auth
  userId: PlayerId | null; // Firebase UID
  username: string | null; // User's chosen nickname

  // Connection
  roomId: RoomId | null; // Current game room
  unsubscribe: (() => void) | null; // Firestore snapshot listener
  initialized: boolean; // First snapshot received?

  // Game State
  game: GameState | null; // Complete game state from Firebase
  isLoading: boolean;
  error: GameError | null;
  isDisplayMode: boolean; // For display-only devices
}
```

**Persistence Layer:**

- Zustand's `persist` middleware saves store to localStorage
- Survives page refreshes
- Rehydrates on app restart

---

## 2. CREATING/JOINING A ROOM: Firebase Integration Setup

### 2.1 User Creates a New Game

**BetaHomeContent** (src/app/beta/page.tsx):

1. User enters nickname and clicks "Create Game"
2. Calls `useBetaStore.initRoom()`

```typescript
const handleCreateGame = async (username: string) => {
  await initRoom(roomCode, {
    createIfMissing: true,
    settings: {
      /* game settings */
    },
    isDisplayMode: false,
  });
};
```

### 2.2 Room Creation in Firebase

**Firebase Function: `createRoom()`** (src/lib/beta/firebase.ts)

```typescript
export const createRoom = async (
  roomId: RoomId,
  userId: PlayerId,
  username: string,
  settings?: Partial<GameSettings>,
  isDisplayMode?: boolean
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);

  const roomData: FirestoreGameRoom = {
    roomId,
    phase: "lobby",
    players: {
      [userId]: {
        name: username,
        role: "setter",
        isOnline: true,
        lastActive: serverTimestamp(),
        score: 0,
      },
    },
    hostId: userId,
    setterId: userId,
    secretWord: "",
    revealedCount: 0,

    signullState: {
      order: {},
      activeIndex: null,
      itemsById: {},
    },

    directGuessesLeft: 3,
    phase: "lobby",

    settings: {
      connectsRequired: 1,
      playMode: "round_robin",
      majorityThreshold: 1,
      timeLimitSeconds: 60,
      maxPlayers: 4,
      wordValidation: "strict",
      ...settings,
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: 2,
  };

  await setDoc(docRef, roomData);
};
```

**Database Location:**

- Collection: `game_rooms_v2` (v2 schema)
- Document ID: Room code (e.g., "TAKE42")

### 2.3 User Joins Existing Room

**Firebase Function: `joinRoom()`**

```typescript
export const joinRoom = async (
  roomId: RoomId,
  userId: PlayerId,
  username: string
): Promise<void> => {
  const docRef = doc(getRoomsCollection(), roomId);

  await runTransaction(getDb(), async (transaction) => {
    const snap = await transaction.get(docRef);

    if (!snap.exists()) {
      throw new Error("ROOM_NOT_FOUND");
    }

    const data = snap.data() as FirestoreGameRoom;

    // Validation checks
    if (Object.keys(data.players).length >= data.settings.maxPlayers) {
      throw new Error("ROOM_FULL");
    }

    if (data.players[userId]) {
      return; // Already in room
    }

    // Add player as guesser
    transaction.update(docRef, {
      [`players.${userId}`]: {
        name: username,
        role: "guesser",
        isOnline: true,
        lastActive: serverTimestamp(),
        score: 0,
      },
      updatedAt: serverTimestamp(),
    });
  });
};
```

**Key Points:**

- Uses Firestore **transactions** for atomicity
- Prevents race conditions with concurrent joins
- Validates room exists and has space
- New players join as "guesser"
- First player is automatically "setter"

---

## 3. LOBBY PHASE: Real-Time State Subscription

### 3.1 Establishing Real-Time Connection

**After room creation/join**, store calls `subscribeToRoom()`:

```typescript
// From beta/store.ts: initRoom()
const unsub = subscribeToRoom(roomId, (state, subError) => {
  if (subError) {
    set({ error: subError });
    return;
  }
  set((prev) => ({
    game: state,
    initialized: true,
    isLoading: prev.isLoading && !prev.initialized ? false : prev.isLoading,
  }));
});
set({ unsubscribe: unsub });
```

### 3.2 Firebase Real-Time Listener

**subscribeToRoom()** (src/lib/beta/firebase.ts):

```typescript
export const subscribeToRoom = (
  roomId: RoomId,
  callback: (state: GameState | null, error?: GameError) => void
) => {
  const docRef = doc(getRoomsCollection(), roomId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }

      try {
        const data = snap.data() as FirestoreGameRoom;

        // Validate schema version
        if (data.schemaVersion !== 2) {
          callback(null, {
            code: "UNSUPPORTED_VERSION",
            message: "Schema version mismatch",
          });
          return;
        }

        // Convert Firestore format → Client format
        callback(firestoreToGameState(data));
      } catch (e) {
        callback(null, { code: "PARSE_ERROR", message: (e as Error).message });
      }
    },
    (err) => {
      callback(null, { code: "SUBSCRIBE_ERROR", message: err.message });
    }
  );
};
```

**How Firebase Real-Time Works:**

1. `onSnapshot()` registers a listener on the document
2. Firebase pushes updates in real-time over WebSocket
3. On any change in Firestore, callback fires immediately
4. Converted data updates Zustand store
5. React re-renders with new state

### 3.3 Data Transformation: Firestore → Client

**firestoreToGameState()** converts raw Firestore data to client format:

```typescript
export const firestoreToGameState = (data: FirestoreGameRoom): GameState => {
  return {
    schemaVersion: 2,
    roomId: data.roomId,
    phase: data.phase,

    // Players: Convert from Firestore objects to typed objects
    players: Object.entries(data.players || {}).reduce(
      (acc, [id, p]) => {
        acc[id] = {
          id,
          name: p.name,
          role: p.role,
          isOnline: p.isOnline,
          lastActive: tsToDate(p.lastActive),
          score: p.score ?? 0
        };
        return acc;
      },
      {} as GameState["players"]
    ),

    hostId: data.hostId ?? null,
    setterId: data.setterId,
    secretWord: data.secretWord,
    revealedCount: data.revealedCount ?? 0,

    // Signull State: Ordered list of word/clue pairs
    signullState: {
      order: data.signullState.order || {},
      activeIndex: data.signullState.activeIndex ?? null,
      itemsById: Object.entries(data.signullState.itemsById || {}).reduce(
        (acc, [id, entry]) => {
          acc[id] = {
            id: entry.id,
            playerId: entry.playerId,
            word: entry.word,
            clue: entry.clue,
            connects: (entry.connects || []).map(c => ({
              playerId: c.playerId,
              guess: c.guess,
              timestamp: tsToDate(c.timestamp),
              isCorrect: c.isCorrect
            })),
            isFinal: entry.isFinal,
            status: entry.status,
            createdAt: tsToDate(entry.createdAt),
            resolvedAt: entry.resolvedAt ? tsToDate(entry.resolvedAt) : undefined
          };
          return acc;
        },
        {} as GameState["signullState"]["itemsById"]
      ),
    },

    directGuessesLeft: data.directGuessesLeft,
    settings: {
      connectsRequired: data.settings?.connectsRequired ?? 1,
      playMode: data.settings?.playMode ?? "round_robin",
      majorityThreshold: data.settings?.majorityThreshold ?? 1,
      timeLimitSeconds: data.settings?.timeLimitSeconds ?? 60,
      maxPlayers: data.settings?.maxPlayers ?? 4,
      wordValidation: data.settings?.wordValidation ?? "strict",
      ...
    }
  };
};
```

### 3.4 Lobby UI Updates in Real-Time

**LobbyPage** (src/app/beta/lobby/page.tsx) reads from store:

```typescript
export default function BetaLobbyPage() {
  const {
    roomId: storeRoomId,
    game: gameState,
    userId: sessionId,
    initialized
  } = useBetaStore();

  const roomId = storeRoomId;
  const gamePhase = gameState?.phase ?? "lobby";
  const players = gameState?.players ?? {};
  const settings = gameState?.settings ?? { /* defaults */ };

  return (
    <>
      <RoomCodeCard roomCode={roomId} />
      <PlayerList players={players} />
      <SettingsCard settings={settings} />
      <StartGameButton />
    </>
  );
}
```

**Rendering Flow:**

1. Store updates `game: GameState`
2. React component re-renders with latest `gameState`
3. Renders `PlayerList` showing all connected players
4. Each player in the list appears in real-time as they join

**Display-Only Mode:**
For presentation/display devices:

```typescript
await initRoomAsDisplay(roomId);
// Subscribes to room but player doesn't appear in players list
// Used for big screen displays
```

---

## 4. GAME STARTS: Phase Transition & Secret Word Setting

### 4.1 Start Game Action

**User clicks "Start Game":**

```typescript
// From LobbyPage
await startGame();
```

### 4.2 Firebase StartGame Function

**startGame()** (src/lib/beta/firebase.ts):

```typescript
export const startGame = async (roomId: RoomId): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

      const data = snap.data() as FirestoreGameRoom;

      // Validate: at least 2 players
      if (Object.keys(data.players).length < 2) {
        throw new Error("NOT_ENOUGH_PLAYERS");
      }

      trx.update(docRef, {
        phase: "setting_word",
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};
```

**Update Flow:**

1. Transaction updates `phase: "setting_word"` in Firestore
2. All connected clients receive snapshot update via `onSnapshot()`
3. Store updates with new phase
4. All UIs transition to secret word entry screen

### 4.3 Secret Word Setting

**SetterUI:** Only the setter sees the "Enter Secret Word" card

**User enters secret word:**

```typescript
await setSecretWord(word);
```

**Firebase Function:**

```typescript
export const setSecretWord = async (
  roomId: RoomId,
  userId: PlayerId,
  word: string
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    const normalizedWord = word.toUpperCase().trim();

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

      const data = snap.data() as FirestoreGameRoom;

      // Validation: only setter can set word
      if (data.setterId !== userId) {
        throw new Error("NOT_SETTER");
      }

      trx.update(docRef, {
        secretWord: normalizedWord,
        phase: "guessing", // Transition to guessing phase
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};
```

**Real-Time Sync:**

1. Secret word saved to Firestore
2. Phase changes to "guessing"
3. All clients get update via onSnapshot
4. Guesser UI shows "Send a Signull" card
5. Game begins

---

## 5. REAL-TIME GAMEPLAY: Signull (Reference) Management

### 5.1 Understanding the Signull System

**Signull** = A word/clue pair from a clue-giver:

- Word: What the clue-giver thinks connects to the secret word
- Clue: Textual hint about that word
- Connects: When guessers "connect" (guess) the signull word
- Status: "pending" → "resolved" (if enough connects match) or "failed"

### 5.2 Creating a Signull

**GuesserUI:** Only guessers can create signulls

```typescript
// From PlayPage component
await addSignull(word, clue);
```

**Firebase Function: addSignull()**

```typescript
export const addSignull = async (
  roomId: RoomId,
  userId: PlayerId,
  word: string,
  clue: string
): Promise<SignullId | null> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    const signullId = generateSignullId(); // sn_${ts}_${rand}

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

      const data = snap.data() as FirestoreGameRoom;

      // Validation
      if (data.phase !== "guessing") {
        throw new Error("INVALID_PHASE");
      }

      const player = data.players[userId];
      if (!player) throw new Error("PLAYER_NOT_FOUND");
      if (player.role !== "guesser") {
        throw new Error("ONLY_GUESSER_CAN_CREATE");
      }

      const upperWord = word.toUpperCase().trim();
      const isFinal = upperWord === data.secretWord;

      // Create new signull entry
      const newSignull: FirestoreSignullEntry = {
        id: signullId,
        playerId: userId,
        word: upperWord,
        clue: clue.trim(),
        connects: [],
        isFinal,
        status: "pending",
        createdAt: serverTimestamp(),
        resolvedAt: null,
      };

      // Add to signullState
      const newOrder = data.signullState.order || {};
      const newItemsById = { ...data.signullState.itemsById };

      newOrder[signullId] = signullId;
      newItemsById[signullId] = newSignull;

      trx.update(docRef, {
        [`signullState.order`]: newOrder,
        [`signullState.itemsById.${signullId}`]: newSignull,
        [`signullState.activeIndex`]:
          data.settings?.playMode === "round_robin"
            ? 0
            : data.signullState.activeIndex,
        updatedAt: serverTimestamp(),
      });
    });

    return signullId;
  } catch (error) {
    handleFirebaseError(error);
    return null;
  }
};
```

**Real-Time Update Flow:**

1. Guesser submits word/clue
2. Firebase transaction creates signull entry
3. Updates `signullState.itemsById[signullId]` in Firestore
4. Adds entry to `signullState.order`
5. All clients get snapshot update
6. All UIs immediately show the new signull

### 5.3 Submitting a Connect

**SetterUI:** Setter "connects" (guesses) the signull

```typescript
// Setter sees signull and types a guess
await submitConnect(guess, signullId);
```

**Firebase Function: submitConnect()**

```typescript
export const submitConnect = async (
  roomId: RoomId,
  userId: PlayerId,
  guess: string,
  signullId: SignullId
): Promise<void> => {
  try {
    const docRef = doc(getRoomsCollection(), roomId);
    const upperGuess = guess.toUpperCase().trim();

    await runTransaction(getDb(), async (trx) => {
      const snap = await trx.get(docRef);
      if (!snap.exists()) throw new Error("ROOM_NOT_FOUND");

      const data = snap.data() as FirestoreGameRoom;

      // Validations
      if (data.phase !== "guessing") {
        throw new Error("INVALID_PHASE");
      }

      const player = data.players[userId];
      if (!player || player.role !== "setter") {
        throw new Error("NOT_SETTER");
      }

      const signull = data.signullState.itemsById[signullId];
      if (!signull) throw new Error("SIGNULL_NOT_FOUND");

      if (signull.status !== "pending") {
        throw new Error("SIGNULL_NOT_PENDING");
      }

      // Check if already connected
      const alreadyConnected = signull.connects?.some(
        (c) => c.playerId === userId
      );
      if (alreadyConnected) {
        throw new Error("ALREADY_CONNECTED");
      }

      // Determine if guess is correct
      const isCorrect = upperGuess === data.secretWord;

      // Record the connect
      const newConnect = {
        playerId: userId,
        guess: upperGuess,
        timestamp: serverTimestamp(),
        isCorrect,
      };

      // Calculate new connects list
      const newConnects = [...(signull.connects || []), newConnect];

      // Check if signull should be resolved
      const connectCount = newConnects.length;
      const requiredConnects = data.settings?.connectsRequired ?? 1;
      const shouldResolve = connectCount >= requiredConnects;

      // Update signull
      trx.update(docRef, {
        [`signullState.itemsById.${signullId}.connects`]: newConnects,
        [`signullState.itemsById.${signullId}.status`]: shouldResolve
          ? "resolved"
          : "pending",
        [`signullState.itemsById.${signullId}.resolvedAt`]: shouldResolve
          ? serverTimestamp()
          : null,
        updatedAt: serverTimestamp(),
      });

      // Calculate and apply score updates
      const scoreUpdates = calculateConnectScore(
        data,
        userId,
        signull,
        newConnects,
        isCorrect
      );

      // Update player scores
      for (const [playerId, scoreChange] of Object.entries(scoreUpdates)) {
        trx.update(docRef, {
          [`players.${playerId}.score`]: increment(scoreChange),
        });
      }
    });
  } catch (error) {
    handleFirebaseError(error);
  }
};
```

**Real-Time Flow:**

1. Setter submits guess
2. Firebase transaction records connect
3. Updates `signullState.itemsById[signullId].connects[]` array
4. All connected clients receive snapshot immediately
5. All UIs update to show:
   - New connect on the signull
   - Updated guess count
   - Resolved status if threshold met
   - Score changes for affected players

---

## 6. FRONTEND ARCHITECTURE OVERVIEW

### 6.1 Layer Architecture

```
┌─────────────────────────────────────────────────┐
│              UI Components Layer                 │
│  (src/app/beta, src/components/beta)            │
│  - Pages: lobby, play, display                  │
│  - Cards: waiting, signull, scores              │
│  - UI: buttons, modals, animations              │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│         State Management Layer (Zustand)         │
│  (src/lib/beta/store.ts)                        │
│  - Persisted to localStorage                    │
│  - Manages: game state, UI modals, auth         │
│  - Subscription management                      │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│       Firebase Wrapper Layer                     │
│  (src/lib/beta/firebase.ts)                     │
│  - Real-time subscription via onSnapshot()      │
│  - Transaction-based mutations                  │
│  - Firestore ↔ Client format conversion         │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│     Firebase Client SDK                         │
│  (Firebase/Firestore v12.1.0)                   │
│  - WebSocket real-time connection               │
│  - Transaction engine                           │
│  - Authentication (Anonymous)                   │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│        Google Cloud: Firestore                   │
│  (Database & Real-time sync)                    │
└─────────────────────────────────────────────────┘
```

### 6.2 Component Structure

**Page Components:**

```
src/app/beta/
├── page.tsx           # Home: create/join room
├── lobby/
│   └── page.tsx       # Player list, settings, start button
├── play/
│   └── page.tsx       # Main game UI with card stack
└── display/
    └── page.tsx       # Display-only mode (big screen)
```

**Card Components (in Play):**

```
<WaitingCard>          # While waiting for setter word
<EnterSecretWordCard>  # Setter enters secret word
<SendASignullCard>     # Guesser enters word/clue
<SignullCard>          # Active signull display with connects
<ScoreBreakdownCard>   # Final round scores
```

### 6.3 Real-Time Data Flow

```
User Action (e.g., submit guess)
        ↓
Component calls Store action (e.g., submitConnect)
        ↓
Store action calls Firebase function (e.g., submitConnect)
        ↓
Firebase Transaction:
  - Validates state
  - Updates Firestore document
  - Returns to client
        ↓
Firestore onSnapshot() fires on ALL connected clients
        ↓
Callback receives new FirestoreGameRoom
        ↓
Convert to GameState via firestoreToGameState()
        ↓
Update Zustand: set({ game: newGameState })
        ↓
React components re-render with new gameState
        ↓
All players see the same state immediately
```

---

## 7. FIRESTORE DATA MODEL (v2 Schema)

### 7.1 Collection Structure

**Collection Name:** `game_rooms_v2`

**Document ID:** Room code (e.g., "TAKE42")

### 7.2 Document Structure

```typescript
{
  // Metadata
  roomId: string;                    // Room code
  schemaVersion: 2;                  // For version checks

  // Game State
  phase: "lobby" | "setting_word" | "guessing" | "ended";
  secretWord: string;                // Setter's secret word
  revealedCount: number;             // Letters revealed
  setterId: string;                  // Firebase UID of setter
  hostId: string;                    // Room creator

  // Players Map
  players: {
    [userId]: {
      name: string;
      role: "setter" | "guesser";
      isOnline: boolean;
      lastActive: Timestamp;
      score: number;                 // Cumulative score
    }
  },

  // Signull State: All word/clue pairs
  signullState: {
    order: Record<SignullId, SignullId>;  // Insertion order
    activeIndex: number | null;            // For round_robin mode
    itemsById: {
      [signullId]: {
        id: SignullId;
        playerId: string;              // Who created this signull
        word: string;                  // The reference word
        clue: string;                  // The textual hint
        isFinal: boolean;              // Does it match secret word?
        status: "pending" | "resolved" | "failed";
        connects: [                    // Setter's guesses
          {
            playerId: string;
            guess: string;
            timestamp: Timestamp;
            isCorrect: boolean;
          }
        ];
        createdAt: Timestamp;
        resolvedAt: Timestamp | null;
      }
    }
  },

  // Game Settings
  settings: {
    connectsRequired: number;         // Connects needed to resolve
    playMode: "round_robin" | "signull";
    majorityThreshold: number;        // Voting threshold
    timeLimitSeconds: number;         // Per-turn time limit
    maxPlayers: number;               // Room capacity
    wordValidation: "strict" | "relaxed";
  },

  // Game Stats
  directGuessesLeft: number;
  isDisplayMode: boolean;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 7.3 Nested Collections (Round Archives)

**Subcollection:** `game_rooms_v2/{roomId}/round_archives/`

Stores completed rounds for replay/history:

```typescript
{
  archiveId: string;
  roundId: string;
  roomId: string;
  secretWord: string;
  playMode: string;
  winner: "setter" | "guessers" | null;
  playerList: [{ id, role, name }];
  signullState: {
    /* snapshot of signullState */
  }
  createdAt: Timestamp;
  completedAt: Timestamp;
}
```

---

## 8. HOW REAL-TIME SYNCHRONIZATION WORKS

### 8.1 The Synchronization Pipeline

```
Firestore (Source of Truth)
        ↓
        └─ Firebase SDK watches document via onSnapshot()
                ↓
                └─ Network receives update (WebSocket/HTTP long-poll)
                        ↓
                        └─ Snapshot object created: snap.data() = new state
                                ↓
                                └─ Client callback fires: (snap) => {...}
                                        ↓
                                        └─ Convert Firestore data → TypeScript objects
                                                ↓
                                                └─ Update Zustand store
                                                        ↓
                                                        └─ React components re-render
                                                                ↓
                                                                └─ User sees update
```

### 8.2 Ordering Guarantees

**Firestore guarantees:**

1. **Consistency:** All clients see the same state eventually
2. **Ordering:** Updates applied in order
3. **Completeness:** Full document snapshot on each update

**The app enforces:**

- Transactions: Multiple operations grouped atomically
- Schema versioning: Ensures compatibility
- Validation: Server-side checks before updates

### 8.3 Conflict Resolution

**Last-Write-Wins (LWW):**

- Each update has a `updatedAt: serverTimestamp()`
- Firestore uses server timestamp for ordering
- No client-side conflict detection needed

**Transaction Safety:**

- All multi-step operations use `runTransaction()`
- Prevents race conditions (e.g., two players trying to resolve same signull)

Example:

```typescript
await runTransaction(getDb(), async (transaction) => {
  // Read current state
  const snap = await transaction.get(docRef);
  const currentData = snap.data();

  // Validate based on current state
  if (/* condition */) {
    throw new Error("Precondition failed");
  }

  // Update atomically
  transaction.update(docRef, { /* changes */ });

  // If any other client modified doc between read and write,
  // transaction.update will fail and entire transaction retries
});
```

### 8.4 Latency & User Experience

**Typical Flow:**

```
User clicks "Submit" at t=0
        ↓
t=10ms: Client sends update to Firebase
        ↓
t=30ms: Firebase processes and saves
        ↓
t=50ms: Firestore broadcasts to all clients
        ↓
t=70ms: Local client receives update
        ↓
t=75ms: Store updates, React re-renders
        ↓
t=80ms: User sees the change
```

**Optimization: Optimistic Updates**

Some mutations could show local feedback immediately while Firebase confirms:

```typescript
// For fast feedback, could implement:
applyOptimisticUpdate(localChange); // Show immediately
sendToFirebase(change); // Confirm server
// If server rejects, roll back optimistic state
```

Currently: No optimistic updates. All updates wait for Firebase confirmation.

### 8.5 Disconnection Handling

**Firebase Offline Behavior:**

- Queued operations stored locally
- Attempts to re-sync when connection restored
- Provides `isConnected` state via connection monitor
- (Currently not fully exposed in UI, but infrastructure exists)

**Current Beta Store:**

- No explicit offline queue
- If Firebase unreachable, operations fail with error
- User must retry manually

---

## 9. KEY FEATURES & PATTERNS

### 9.1 Real-Time Player Presence

```typescript
// Every player's lastActive timestamp updates on Firestore changes
players[userId].lastActive = serverTimestamp();

// Could detect offline players:
const isOffline = Date.now() - player.lastActive.toDate() > 30000;
```

### 9.2 Atomic Game Transitions

```typescript
// All game state changes atomic via transactions
phase: "lobby" → "setting_word" (all at once)
secretWord set AND phase changed (together)
signull resolved AND scores updated (together)
```

### 9.3 Ordered Reference List

```typescript
// signullState.order maintains insertion order
order: {
  "sn_abc_123": "sn_abc_123",
  "sn_def_456": "sn_def_456",
  "sn_ghi_789": "sn_ghi_789"
}

// Iterate in order: Object.keys(order) gives sequence
// Round-robin mode uses activeIndex to cycle through
```

### 9.4 Scoring & Points

```typescript
// Player scores update atomically with signull resolution
transaction.update(docRef, {
  [`players.${playerId}.score`]: increment(points),
  [`signullState.itemsById.${signullId}.status`]: "resolved",
});
```

### 9.5 Score Calculation

**calculateConnectScore()** (src/lib/beta/scoring.ts):

- Correct guess: Points for guesser + setter
- Wrong guess: No points
- Signull creator: Bonus for successful signull
- Direct guess: Special scoring

Scoring architecture is separate from game logic.

---

## 10. PERFORMANCE CONSIDERATIONS

### 10.1 Snapshot Size

**Problem:** Large roomId with many signulls = large Firestore document

**Current Solution:**

- Single document per room (flat structure)
- 1 MB Firestore document size limit
- Scales to ~100-500 signulls depending on complexity

**Future Optimization:**

- Subcollections for signulls (separate collection)
- Pagination/lazy loading of old rounds

### 10.2 Update Frequency

**High-frequency updates:**

- Each guess/connect triggers update
- With 8 players = potentially many updates/second
- Firebase handles this well

**Batching Opportunities:**

- Could batch connects over 100ms windows
- Trade: Slight latency vs. network efficiency
- Not currently implemented

### 10.3 Component Re-renders

**Zustand Optimization:**

```typescript
// Selectors avoid unnecessary re-renders
useGame(); // Only re-renders if game state changes
useIsSetter(); // Only re-renders if setter status changes
```

Used in components:

```typescript
const game = useGame(); // Custom selector
const isSetter = useIsSetter(); // Derived state
```

---

## 11. ERROR HANDLING & EDGE CASES

### 11.1 Firebase Transaction Failures

```typescript
try {
  await transaction.update(docRef, updates);
} catch (error) {
  // Transaction automatically retried by Firebase
  // If still fails: handleFirebaseError(error)
}
```

### 11.2 Room Not Found

```typescript
// When subscribeToRoom gets empty snapshot
if (!snap.exists()) {
  callback(null); // Signals room deleted
  // UI shows "Room not found"
}
```

### 11.3 Schema Version Mismatch

```typescript
if (data.schemaVersion !== 2) {
  callback(null, { code: "UNSUPPORTED_VERSION", ... });
  // Prevents parsing v1 rooms with v2 code
}
```

### 11.4 Player Disconnection

```typescript
// Each player has isOnline flag
// Updated in transaction.update()
[`players.${userId}.isOnline`]: false
```

---

## 12. DEBUGGING & MONITORING

### 12.1 Action Logging

**Not currently persisted, but logged in console:**

```typescript
get().recordAction(actionId, action, actor);
// Logs: "CREATE_ROOM", "JOIN_ROOM", "SUBMIT_CONNECT", etc.
// Useful for understanding user flow
```

### 12.2 Firebase Rules (Security)

**Located in:** `prototype/firebase.json` (Firestore Security Rules)

Control:

- Who can create rooms
- Who can join rooms
- Who can modify game state
- Rate limiting

### 12.3 Local Debug Info

**File:** `src/lib/beta/debug.ts`

Exports utilities:

- `logScorecard()` - Prints score breakdown
- `getSignullStatusLabel()` - Human-readable status

---

## 13. SUMMARY: USER JOURNEY MAP

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                              │
└─────────────────────────────────────────────────────────────┘

[1] User Opens App
    ↓
    - RootLayout initializes
    - AuthProvider calls initAuth()
    - Firebase anonymous auth creates UID
    - Zustand store persisted to localStorage
    - Redirect to /beta
    ↓
[2] User Creates/Joins Room
    ↓
    - Calls useBetaStore.initRoom(roomId)
    - Firebase: createRoom() or joinRoom()
    - Transaction: Creates/joins room doc
    - subscribeToRoom() sets up onSnapshot listener
    ↓
[3] Lobby Phase
    ↓
    - onSnapshot fires for each player join
    - Store updates players list
    - All UIs show updated player list in real-time
    - Host can adjust settings
    ↓
[4] Start Game
    ↓
    - Host clicks "Start Game"
    - Firebase: Updates phase to "setting_word"
    - onSnapshot fires for all clients
    - UI transitions to word-entry screen
    ↓
[5] Setter Sets Secret Word
    ↓
    - Only setter sees input form
    - Firebase: setSecretWord() updates document
    - Transaction: phase → "guessing"
    - onSnapshot fires for all clients
    ↓
[6] Guessing Phase Begins
    ↓
    - Guessers see "Send a Signull" card
    - Each guesser adds word/clue pair
    - Firebase: addSignull() creates entry
    - onSnapshot: All see new signull immediately
    ↓
[7] Setter Connects (Guesses)
    ↓
    - Setter sees list of signulls
    - Setter guesses each one
    - Firebase: submitConnect() records guess
    - Transaction: Updates connects[], calculates scores
    - onSnapshot: All see updated connects immediately
    ↓
[8] Signull Resolved
    ↓
    - If connects >= required: status = "resolved"
    - Scores update atomically
    - All players see resolved state & score changes
    ↓
[9] Game Ends
    ↓
    - Round complete when all signulls resolved
    - Firebase: Updates phase to "ended"
    - Shows final scorecard
    ↓
[10] Play Again or Leave
    ↓
    - Return to lobby or leave room
    - Unsubscribe from snapshot listener
    - Clean up localStorage entry

═══════════════════════════════════════════════════════════════

THROUGHOUT: Real-time sync via Firestore onSnapshot()
- Every Firebase update triggers snapshot callback
- New GameState flows through store to all components
- All players see identical state within ~50-100ms
```

---

## 14. CODE REFERENCE GUIDE

### Key Files

| File                          | Purpose                                     |
| ----------------------------- | ------------------------------------------- |
| `src/lib/beta/store.ts`       | Main Zustand store with game actions        |
| `src/lib/beta/firebase.ts`    | Firebase functions & real-time subscription |
| `src/lib/beta/types.ts`       | TypeScript interfaces for game state        |
| `src/app/beta/lobby/page.tsx` | Lobby UI                                    |
| `src/app/beta/play/page.tsx`  | Main game UI                                |
| `src/lib/beta/selectors.ts`   | Store selector hooks                        |
| `src/lib/beta/scoring.ts`     | Score calculation logic                     |

### Key Functions

| Function                 | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `subscribeToRoom()`      | Sets up real-time listener               |
| `createRoom()`           | Creates new game                         |
| `joinRoom()`             | Player joins room                        |
| `addSignull()`           | Create word/clue pair                    |
| `submitConnect()`        | Setter guesses signull                   |
| `firestoreToGameState()` | Converts Firestore data to client format |
| `setSecretWord()`        | Setter enters secret word                |

### Store State Shape

```typescript
{
  // Auth
  userId: string;
  username: string;

  // Connection
  roomId: string | null;
  game: GameState | null;
  initialized: boolean;
  unsubscribe: () => void;

  // UI
  isLoading: boolean;
  error: GameError | null;
  isDisplayMode: boolean;
  showTutorial: boolean;
}
```

---

## 15. CONCLUSION

The Signull app demonstrates a robust real-time multiplayer architecture:

1. **Authentication:** Anonymous Firebase Auth for quick onboarding
2. **State Management:** Zustand with persistence for offline resilience
3. **Real-Time Sync:** Firestore's `onSnapshot()` for automatic updates
4. **Transactions:** Ensures consistency across concurrent operations
5. **Latency:** ~50-100ms typical from action to all-players update
6. **Scalability:** Single document model works up to moderate player counts
7. **Architecture:** Clean separation of concerns (UI → Store → Firebase)

The system provides a seamless experience where players feel like they're playing together in real-time, with all state changes synchronized automatically across all connected clients.
