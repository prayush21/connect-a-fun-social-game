# Phase 2 Implementation - Reference Revamp Backend Behaviors

## Overview

Phase 2 implements the backend persistence, transaction logic, and core behaviors for the new `referenceState` architecture that supports both `round_robin` and `signull` play modes.

## Prerequisites

✅ Phase 1 Complete: Schema + Types defined in `types.ts`

## Goals

1. **Room Initialization**: Create rooms with proper `referenceState` structure
2. **Reference Creation**: Transactional append to order array and itemsById map
3. **Reference Resolution**: Status updates and history tracking
4. **Play Mode Behaviors**: Round robin pointer advancement vs signull free-choice
5. **Backward Compatibility**: Maintain `currentReference` during migration

---

## Implementation Tasks

### 1. Converter Functions (game.ts)

#### A. Update `firestoreToGameState`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 28)

**Current State**: Only converts `currentReference` field

**Changes Needed**:

```typescript
// Add conversion for referenceState
referenceState: data.referenceState
  ? {
      order: data.referenceState.order || [],
      activeIndex: data.referenceState.activeIndex,
      itemsById: Object.entries(data.referenceState.itemsById || {}).reduce(
        (acc, [id, entry]) => {
          acc[id] = {
            ...entry,
            timestamp: entry.timestamp instanceof Timestamp
              ? entry.timestamp.toDate()
              : new Date(),
            resolvedAt: entry.resolvedAt instanceof Timestamp
              ? entry.resolvedAt.toDate()
              : entry.resolvedAt || undefined,
          };
          return acc;
        },
        {} as Record<string, ReferenceEntry>
      ),
    }
  : {
      // Default empty state for backward compatibility
      order: [],
      activeIndex: data.settings?.playMode === "round_robin" ? 0 : null,
      itemsById: {},
    },
```

**Considerations**:

- Convert Firestore Timestamps to Date objects
- Provide default empty state if field missing (backward compatibility)
- Respect playMode for activeIndex initialization

---

#### B. Update `gameStateToFirestore`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 113)

**Current State**: Only serializes `currentReference` field

**Changes Needed**:

```typescript
// Add serialization for referenceState
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
          };
          return acc;
        },
        {} as Record<string, FirestoreReferenceEntry>
      ),
    }
  : undefined,
```

**Considerations**:

- Convert Date objects to Firestore serverTimestamp()
- Keep currentReference for now (will deprecate in Phase 4)

---

### 2. Room Creation (game.ts)

#### Update `createRoom`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 167)

**Current State**: Only initializes `currentReference: null`

**Changes Needed**:

```typescript
// Add to initialGameState
referenceState: {
  order: [],
  activeIndex: null, // Will be set to 0 when first guesser joins for round_robin
  itemsById: {},
},
```

**Considerations**:

- Start with `activeIndex: null` - will be initialized when game starts
- Empty order and itemsById for fresh game
- Mode-specific initialization happens in `startGameRound`

---

### 3. Reference Creation

#### A. Create `generateReferenceId` Helper

**Location**: `/frontend/src/lib/firebase/game.ts` (new function, add near utilities)

**Implementation**:

```typescript
/**
 * Generate a unique reference ID
 * Format: ref_<timestamp>_<random>
 */
export const generateReferenceId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ref_${timestamp}_${random}`;
};
```

---

#### B. Create `createReference` Transaction Function

**Location**: `/frontend/src/lib/firebase/game.ts` (new function)

**Purpose**: Atomically create a new reference entry in both modes

**Signature**:

```typescript
export const createReference = async (
  roomId: RoomId,
  clueGiverId: PlayerId,
  referenceWord: string,
  clue: string
): Promise<string> // Returns the generated reference ID
```

**Implementation Strategy**:

```typescript
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
      guesses: {},
      setterAttempt: "",
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
```

**Key Points**:

- Uses `arrayUnion` for idempotent order append
- Uses deep path `itemsById.${refId}` for setting entry
- Round robin: activeIndex points to new reference (order.length)
- Signull: activeIndex stays null
- Maintains backward compatibility with currentReference

---

#### C. Refactor `setReference`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 328)

**Changes**:

```typescript
export const setReference = async (
  roomId: RoomId,
  clueGiverId: PlayerId,
  referenceWord: string,
  clue: string
): Promise<void> => {
  // Delegate to new createReference function
  await createReference(roomId, clueGiverId, referenceWord, clue);
};
```

**Rationale**: Keep existing API but use new internal implementation

---

### 4. Reference Resolution

#### A. Create Helper Functions

**Location**: `/frontend/src/lib/firebase/game.ts` (new functions)

**1. Get Active Reference (Round Robin)**:

```typescript
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
```

**2. Get Reference by ID**:

```typescript
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
```

**3. Advance Round Robin Pointer**:

```typescript
/**
 * Calculate next activeIndex for round_robin after resolution
 */
const advanceRoundRobinIndex = (
  currentIndex: number,
  guesserCount: number
): number => {
  return guesserCount > 0 ? (currentIndex + 1) % guesserCount : 0;
};
```

---

#### B. Refactor `checkReferenceResolution`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 820)

**Major Refactor**: This function needs to handle both modes and work with referenceState

**Key Changes**:

1. **Read from referenceState instead of currentReference**
2. **Support both modes**: Use activeIndex for round_robin, specific refId for signull
3. **Update status fields**: Set `status: "resolved"` or `status: "failed"`
4. **Stamp resolvedAt timestamp**
5. **Advance activeIndex for round_robin only**

**New Signature**:

```typescript
export const checkReferenceResolution = async (
  roomId: RoomId,
  refId?: string // Optional: specific reference to resolve (for signull)
): Promise<void>
```

**Pseudo-code Flow**:

```typescript
await runTransaction(getDb(), async (transaction) => {
  // 1. Read document
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

  if (!targetRef || !targetRefId) return;

  // 3. Check resolution conditions (majority, setter block, etc.)
  const resolutionOutcome = calculateResolution(targetRef, data);

  // 4. Update based on outcome
  if (resolutionOutcome.type === "success") {
    // Mark as resolved, update game state
    transaction.update(docRef, {
      [`referenceState.itemsById.${targetRefId}.status`]: "resolved",
      [`referenceState.itemsById.${targetRefId}.resolvedAt`]: serverTimestamp(),
      revealedCount: resolutionOutcome.newRevealedCount,
      "referenceState.activeIndex":
        playMode === "round_robin"
          ? advanceRoundRobinIndex(refState.activeIndex!, guesserCount)
          : null,
      // Clear currentReference for backward compat
      currentReference: null,
      gameHistory: arrayUnion(...resolutionOutcome.messages),
      // Check for game end conditions
      gamePhase: resolutionOutcome.isGameEnd ? "ended" : data.gamePhase,
      winner: resolutionOutcome.winner || data.winner,
      updatedAt: serverTimestamp(),
    });
  } else if (resolutionOutcome.type === "failed") {
    // Mark as failed, advance turn
    transaction.update(docRef, {
      [`referenceState.itemsById.${targetRefId}.status`]: "failed",
      [`referenceState.itemsById.${targetRefId}.resolvedAt`]: serverTimestamp(),
      "referenceState.activeIndex":
        playMode === "round_robin"
          ? advanceRoundRobinIndex(refState.activeIndex!, guesserCount)
          : null,
      currentReference: null,
      gameHistory: arrayUnion(...resolutionOutcome.messages),
      updatedAt: serverTimestamp(),
    });
  }
});
```

**Resolution Logic Considerations**:

- Add current resolution logic into `calculateResolution` helper
- Check for final round victory
- Check for complete word reveal
- Return structured outcome with type, messages, state changes

---

calculateResolution(){

        get the connectsRequired variable from data/gameSetting
        sort the connects array of the targetRef by timestamp,

        correctConnectsCount = 0

        for(auto connect: targetRef.connects){
            if(connect.role == 'setter' && connect.guess.toLowerCase() == targetRef.referenceWord.toLowerCase()){
                return {type: "failed", reason: "setter guessed the reference word correctly before the team"}
            }else if(connect.role == 'guesser'){
                if(connect.guess == referenceWord)
                    correctConnectsCount++
            }
        }

        if(isFinal && correctConnectsCount > 0)
            return {type: "success", reason: "{correctConnectCount} Connects were correct. Reference Word: {referenceWord}"}

        if(correctConnectsCount >= connectsRequired){
            return {
                type: "success", reason: "{correctConnectsCount} correctly connected with Reference Word: {referenceWord}"
            }
        }

        totalGuesserConnectsCount = targetRef.connects.filter(connect => connect.role == "guesser")
        if(totalGuesserConnectsCount == totalActiveGuessers){
            return {
                type: "failed",
                reason: "Required number of correct connects weren't made"
            }
        }else if(totalGuesserConnectsCount < totalActiveGuessers){
            return {type: "pending", reason: "Just {connectRequired - correctConnectsCount} required!"}
        }

}

### 5. Connect Submission (Reference Guesses)

#### Update `submitConnect`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 406)

**Purpose**: Unified function for both guesser and setter submissions on references. Replaces `submitGuess` and `submitSetterGuess` for reference-based guesses.

**Changes**:

1. **Rename from `submitGuess` to `submitConnect`**
2. **Add optional refId parameter** (defaults to active reference in round_robin)
3. **Store connects in the `connects` array** instead of separate `guesses` and `setterAttempt` fields
4. **Deprecate setterAttempt field** - use connects array for all submissions
5. **Maintain backward compatibility** with currentReference

**New Signature**:

```typescript
export const submitConnect = async (
  roomId: RoomId,
  playerId: PlayerId,
  connectWord: string,
  refId?: string // Optional: specific reference to connect on (required for signull)
): Promise<void>
```

**Implementation Strategy**:

```typescript
await runTransaction(getDb(), async (transaction) => {
  const docSnap = await transaction.get(docRef);
  const data = docSnap.data() as FirestoreGameRoom;
  const playMode = data.settings?.playMode || "round_robin";
  const refState = data.referenceState;

  // Get player info to determine role
  const player = data.players?.[playerId];
  if (!player) throw new Error("Player not found");

  const playerRole = player.role; // 'guesser' | 'setter'

  // Determine target reference
  let targetRefId: string;
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

  // Check idempotency - see if player already submitted a connect
  const existingConnect = targetRef.connects?.find(
    (c) => c.playerId === playerId
  );
  if (existingConnect) {
    return; // Already submitted
  }

  // Create new connect entry
  const connectEntry = {
    playerId,
    role: playerRole,
    guess: connectWord.toUpperCase(),
    timestamp: serverTimestamp(),
  };

  // Update connect in array using arrayUnion
  transaction.update(docRef, {
    [`referenceState.itemsById.${targetRefId}.connects`]:
      arrayUnion(connectEntry),
    // Also update currentReference for backward compat
    ...(playerRole === "guesser"
      ? { [`currentReference.guesses.${playerId}`]: connectWord.toLowerCase() }
      : { [`currentReference.setterAttempt`]: connectWord.toLowerCase() }),
    gameHistory: arrayUnion({
      id: `connect_${playerId}_${Date.now()}`,
      message: `${player.name} raised a connect!`,
      timestamp: serverTimestamp(),
      type: "info",
      alignment: "right",
      playerId: playerId,
    }),
    updatedAt: serverTimestamp(),
  });
});

// Trigger resolution check
await checkReferenceResolution(roomId, targetRefId);
```

**Key Points**:

- **Unified Submission**: Both guessers and setters use the same function
- **Connects Array**: All submissions stored in `referenceState.itemsById[refId].connects[]`
- **Role-Based Logic**: Player role determines behavior in resolution
- **Idempotency**: Check if player already has a connect in the array
- **Timestamp Ordering**: Each connect has a timestamp for resolution ordering

---

#### Deprecation Plan for `submitGuess` and `submitSetterGuess`

**Phase 2 Actions**:

1. **Don't Keep old functions as wrappers** :

```typescript
// Deprecated: Use submitConnect instead
export const submitGuess = async (
  roomId: RoomId,
  playerId: PlayerId,
  guess: string,
  refId?: string
): Promise<void> => {
  console.warn("submitGuess is deprecated. Use submitConnect instead.");
  await submitConnect(roomId, playerId, guess, refId);
};

// Deprecated: Use submitConnect instead
export const submitSetterGuess = async (
  roomId: RoomId,
  setterId: PlayerId,
  guess: string,
  refId?: string
): Promise<void> => {
  console.warn("submitSetterGuess is deprecated. Use submitConnect instead.");
  await submitConnect(roomId, setterId, guess, refId);
};
```

2. **Phase 3**: Update all UI components to call `submitConnect`
3. **Phase 4**: Remove deprecated functions entirely

---

#### Update Resolution Logic to Use Connects Array

**Location**: Update `calculateResolution` helper (created in Section 4)

#### Migration Notes

**Schema Changes**:

- **Old**: `guesses: Record<PlayerId, string>`, `setterAttempt: string`
- **New**: `connects: ConnectEntry[]`

**Backward Compatibility**:

- During Phase 2-3, write to both `connects[]` and old fields
- Phase 4 will remove old fields and migration script

---

### 6. Game Reset Functions

#### A. Update `returnToLobby`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 800)

**Changes**:

```typescript
referenceState: {
  order: [],
  activeIndex: data.settings?.playMode === "round_robin" ? 0 : null,
  itemsById: {},
},
```

#### B. Update `leaveRoom` (setter leaving)

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 232)

**Changes**: When resetting game phase, also reset referenceState

```typescript
referenceState: {
  order: [],
  activeIndex: null,
  itemsById: {},
},
```

#### C. Update `volunteerAsClueGiver`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 660)

**Changes**: Clear referenceState along with currentReference

```typescript
// Don't need to clear entire state, just set currentReference to null
// referenceState will handle active references properly
currentReference: null,
```

---

### 7. Start Game Logic

#### Update `startGameRound`

**Location**: `/frontend/src/lib/firebase/game.ts` (~line 705)

**Consideration**: When transitioning from lobby to setting_word, initialize activeIndex properly

**Changes**:

```typescript
export const startGameRound = async (roomId: RoomId): Promise<void> => {
  const gameRef = doc(getGameRoomsCollection(), roomId);
  const docSnap = await getDoc(gameRef);
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
```

---

## Testing Strategy

### Unit Tests Needed

1. **Reference ID Generation**
   - Test uniqueness
   - Test format consistency

2. **Converter Functions**
   - Test Timestamp conversion
   - Test backward compatibility (missing referenceState)
   - Test empty state defaults

3. **Reference Creation**
   - Test transaction idempotency
   - Test order array growth
   - Test activeIndex calculation for both modes
   - Test final round detection

4. **Resolution Logic**
   - Test setter block
   - Test status transitions
   - Test activeIndex advancement (round_robin)
   - Test signull multi-reference handling

5. **Guess Submission**
   - Test idempotency
   - Test deep path updates
   - Test refId resolution (signull)
   - Test active reference resolution (round_robin)

### Integration Tests Needed

1. **Round Robin Flow**
   - Create reference → Submit guesses → Resolve → Next turn
   - Verify activeIndex advances correctly
   - Verify only one active reference at a time

2. **Signull Flow**
   - Multiple references created
   - Guessers choose different references
   - Resolution doesn't affect other pending references
   - No turn rotation

3. **Backward Compatibility**
   - Old rooms without referenceState load correctly
   - currentReference still updated during transition
   - Existing games continue to work

### Manual Testing Scenarios

1. **Create new round_robin game**
   - Set word → Create references → Complete round → Verify pointer advances

2. **Create new signull game**
   - Set word → Multiple players create references → Resolve different refs in parallel

3. **Migrate existing game**
   - Load old game → Verify it still works → Transition to new structure

---

## Migration Considerations

### Phase 2 Deployment

1. **Deploy with backward compatibility**
   - Both `currentReference` and `referenceState` written
   - Old clients can still read `currentReference`
   - New clients prefer `referenceState`

2. **Monitor for issues**
   - Track usage of new vs old structure
   - Watch for transaction conflicts
   - Monitor performance of deep path updates

3. **Gradual Rollout**
   - New rooms use referenceState by default
   - Existing rooms continue with currentReference
   - Phase 3 will update UI to use selectors

---

## Success Criteria

✅ Room creation initializes referenceState correctly for both modes  
✅ Reference creation uses transactions with arrayUnion  
✅ Resolution updates status fields and advances pointer (round_robin)  
✅ Guess submission works with refId parameter  
✅ Backward compatibility maintained (currentReference still works)  
✅ No data loss during reference lifecycle  
✅ Transaction conflicts handled gracefully

---

## Next Steps: Phase 3

Phase 3 will update the client-side code:

- Create selector functions for reference access
- Update UI components to use selectors
- Remove direct `currentReference` access
- Add signull-specific UI (reference selection dropdown)
- Update optimistic updates to work with referenceState

---

## Files to Modify

| File                                | Lines | Changes                             |
| ----------------------------------- | ----- | ----------------------------------- |
| `frontend/src/lib/firebase/game.ts` | ~28   | Update `firestoreToGameState`       |
| `frontend/src/lib/firebase/game.ts` | ~113  | Update `gameStateToFirestore`       |
| `frontend/src/lib/firebase/game.ts` | ~167  | Update `createRoom`                 |
| `frontend/src/lib/firebase/game.ts` | New   | Add `generateReferenceId`           |
| `frontend/src/lib/firebase/game.ts` | New   | Add `createReference`               |
| `frontend/src/lib/firebase/game.ts` | ~328  | Refactor `setReference`             |
| `frontend/src/lib/firebase/game.ts` | New   | Add `getActiveReferenceRR`          |
| `frontend/src/lib/firebase/game.ts` | New   | Add `getReferenceById`              |
| `frontend/src/lib/firebase/game.ts` | New   | Add `advanceRoundRobinIndex`        |
| `frontend/src/lib/firebase/game.ts` | New   | Add `calculateResolution`           |
| `frontend/src/lib/firebase/game.ts` | ~820  | Refactor `checkReferenceResolution` |
| `frontend/src/lib/firebase/game.ts` | ~406  | Update `submitGuess`                |
| `frontend/src/lib/firebase/game.ts` | ~740  | Update `submitSetterGuess`          |
| `frontend/src/lib/firebase/game.ts` | ~800  | Update `returnToLobby`              |
| `frontend/src/lib/firebase/game.ts` | ~232  | Update `leaveRoom`                  |
| `frontend/src/lib/firebase/game.ts` | ~705  | Update `startGameRound`             |

**Estimated Lines of Code**: ~600-800 new/modified lines

---

## Timeline Estimate

- **Converter Functions**: 2-3 hours
- **Reference Creation**: 3-4 hours
- **Resolution Logic**: 4-5 hours (most complex)
- **Guess Submission**: 2-3 hours
- **Game Reset Functions**: 1-2 hours
- **Testing**: 4-5 hours
- **Documentation**: 1-2 hours

**Total**: ~17-24 hours of focused development

---

## Risk Assessment

| Risk                                          | Severity | Mitigation                                          |
| --------------------------------------------- | -------- | --------------------------------------------------- |
| Transaction conflicts with concurrent guesses | Medium   | Use deep paths, test under load                     |
| Data migration issues                         | High     | Extensive backward compatibility, gradual rollout   |
| activeIndex pointer desync                    | Medium   | Validate in resolution logic, add recovery function |
| Performance of deep path updates              | Low      | Monitor, optimize if needed                         |
| Loss of currentReference during transition    | Medium   | Dual-write both fields during Phase 2-3             |

---

## Open Questions

1. **Archive Strategy**: Should resolved references be moved to an archive array or kept in itemsById?
   - **Recommendation**: Keep in itemsById with status="resolved" for Phase 2, add archive in Phase 4

2. **Reference Limit**: Should we limit the number of pending references in signull mode?
   - **Recommendation**: No limit for Phase 2, can add later if performance issues

3. **Cleanup**: When/how to remove old currentReference field?
   - **Recommendation**: Phase 4 after all clients updated

4. **Failed Reference Handling**: Should failed references be retryable?
   - **Recommendation**: No for Phase 2, keep status="failed" as final

---

## Appendix: Key Code Patterns

### Pattern 1: Deep Path Updates

```typescript
transaction.update(docRef, {
  [`referenceState.itemsById.${refId}.status`]: "resolved",
  [`referenceState.itemsById.${refId}.resolvedAt`]: serverTimestamp(),
});
```

### Pattern 2: ArrayUnion for Idempotency

```typescript
transaction.update(docRef, {
  "referenceState.order": arrayUnion(refId),
});
```

### Pattern 3: Mode-Specific Logic

```typescript
const targetRef =
  playMode === "round_robin"
    ? getActiveReferenceRR(refState)
    : getReferenceById(refState, refId);
```

### Pattern 4: Status Transitions

```typescript
// Only act on pending references
if (targetRef.status !== "pending") return;

// Transition to resolved or failed
transaction.update(docRef, {
  [`referenceState.itemsById.${refId}.status`]:
    outcome === "success" ? "resolved" : "failed",
});
```

---

**Document Version**: 1.0  
**Last Updated**: November 8, 2025  
**Author**: GitHub Copilot  
**Status**: Ready for Implementation
