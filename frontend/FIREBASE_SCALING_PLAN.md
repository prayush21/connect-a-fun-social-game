# Firebase Scaling Plan

This document captures the recommended path for scaling the current beta game architecture beyond the one-room-document model.

The current `/beta` game uses a single canonical Firestore document per room:

```txt
game_rooms_v2/{roomId}
```

That document stores room metadata, players, settings, Signulls, connects, scores, phase, and endgame state. This is simple and effective for early multiplayer, but it eventually runs into document write contention, growing snapshot payloads, broad re-renders, and harder rule enforcement.

The recommended migration path is an adapter migration, not a rewrite: keep the UI thinking in terms of "the current game" while the Firebase layer gradually splits hot and growing data into narrower documents and collections.

## Goals

- Reduce write contention on a single Firestore document.
- Reduce snapshot payload size for real-time listeners.
- Split room, round, player, Signull, connect, and score-event concerns.
- Preserve the existing frontend mental model during migration.
- Add tests that prove the composed client state still matches the logical game state.
- Move critical validation and scoring server-side once the schema is cleaner.

## Phase 0: Baseline And Guardrails

Document the current schema and behavior before migration.

- Capture the current `game_rooms_v2/{roomId}` fields.
- Identify which fields are room-level, round-level, player-level, and event-level.
- List every write path:
  - create room
  - join room
  - leave room
  - update settings
  - change setter
  - start game
  - set secret word
  - add Signull
  - submit connect
  - submit direct guess
  - end game
  - play again / back to lobby
- Add light development observability:
  - snapshot size
  - writes per action
  - transaction failures/retries
  - room document growth during a full game
- Define the next schema as `schemaVersion: 3`.
- Keep v2 code working while v3 is developed behind separate helpers.

### Phase 0 Tests

Add tests that lock in current behavior before changing the model.

- Room creation creates expected initial state.
- Joining adds players and assigns host/setter correctly.
- Starting game transitions `lobby -> setting`.
- Setting secret word transitions `setting -> signulls`.
- Sending a Signull creates pending state.
- Connect submission resolves, blocks, fails, or leaves pending correctly.
- Direct guesses decrement attempts or end the game.
- Score events and player score totals match expected outcomes.

Recommended initial test files:

```txt
frontend/src/lib/beta/firebase.test.ts
frontend/src/lib/beta/selectors.test.ts
frontend/src/lib/beta/store.test.ts
```

Use Vitest for pure logic and the Firebase Emulator for transaction/write behavior.

## Phase 1: Split Room And Round

Introduce a v3 schema that separates persistent room state from current-round state.

```txt
rooms_v3/{roomId}
  schemaVersion
  roomId
  phase
  hostId
  currentRoundId
  isDisplayMode
  settings
  createdAt
  updatedAt

rooms_v3/{roomId}/rounds/{roundId}
  roundId
  setterId
  secretWord
  revealedCount
  directGuessesLeft
  lastDirectGuess
  winner
  scoreCountingComplete
  insights
  startedAt
  endedAt
  updatedAt
```

The room document answers "does this room exist and what is it doing?" The round document answers "what is happening in this specific game round?"

The client should compose room + current round into the same logical `GameState` shape the UI already expects.

### Phase 1 Tests

- `createRoomV3()` creates `rooms_v3/{roomId}`.
- Starting a game creates or points to a valid `rounds/{roundId}`.
- Room + round documents compose into the expected UI-facing game state.
- `playAgain` creates or resets a round without destroying durable room settings.

## Phase 2: Move Players To A Subcollection

Introduce:

```txt
rooms_v3/{roomId}/players/{playerId}
  id
  name
  role
  isOnline
  lastActive
  score
  joinedAt
  updatedAt
```

Changes:

- Lobby subscribes to room metadata and `/players`.
- Join/leave/change-setter writes player docs instead of mutating a giant players map.
- `hostId` remains on the room document for quick access.
- `setterId` remains on the current round, or on the room while in lobby.

Benefit: joins, name changes, score changes, and presence-like fields no longer rewrite the whole room document.

### Phase 2 Tests

- Joining creates a player document.
- First player becomes host and setter.
- Later players become guessers.
- Leaving removes or marks the player according to the chosen membership policy.
- Host transfer works when the host leaves.
- Setter transfer works when the setter leaves.
- Player collection + room + round compose into the expected `players` map.

## Phase 3: Move Signulls To A Round Subcollection

Introduce:

```txt
rooms_v3/{roomId}/rounds/{roundId}/signulls/{signullId}
  id
  playerId
  word
  clue
  status
  isFinal
  stage
  createdAt
  resolvedAt
```

For connects, choose one of two models.

Option A, simpler first step:

```txt
signulls/{signullId}
  connects: [...]
```

Option B, maximum scale:

```txt
rooms_v3/{roomId}/rounds/{roundId}/signulls/{signullId}/connects/{connectId}
  playerId
  guess
  isCorrect
  timestamp
```

If room sizes stay small, Option A is a reasonable bridge. If larger rooms or rapid submissions are expected, split connects immediately.

### Phase 3 Tests

- Signull is created under the current round.
- Signull uses the correct `stage` / `revealedCount`.
- Prefix-mode validation works.
- Connect is rejected for duplicate player.
- Connect is rejected for own Signull.
- Correct connects resolve at `connectsRequired`.
- Setter intercept blocks.
- Failed final Signull ends the game for setter.
- Resolved final Signull ends the game for guessers.
- Resolving one Signull in a stage inactivates other pending Signulls if that rule remains.

Use the Firebase Emulator for transaction behavior.

## Phase 4: Compose Client State From Multiple Listeners

Replace the single room listener:

```ts
subscribeToRoom(roomId)
```

with narrower subscriptions:

```ts
subscribeToRoomMeta(roomId)
subscribeToPlayers(roomId)
subscribeToCurrentRound(roomId, roundId)
subscribeToSignulls(roomId, roundId)
subscribeToScoreEvents(roomId, roundId)
```

Zustand can still expose a convenient composed shape:

```ts
game: {
  roomId,
  phase,
  players,
  setterId,
  secretWord,
  revealedCount,
  signullState,
  directGuessesLeft,
  winner,
  settings,
  scoreEvents,
  insights
}
```

This keeps lobby and play components mostly stable while Firebase reads become narrower.

### Phase 4 Tests

Add subscription composition tests:

- Player A creates room.
- Player B joins.
- Both clients receive updated players.
- Host starts game.
- Both clients receive phase update.
- Setter sets word.
- Guessers receive `signulls` phase.
- Guesser sends Signull.
- Other clients receive new Signull.
- Another player connects.
- All clients receive updated Signull status and revealed count.

Simulate multiple clients with multiple store instances or lower-level subscription objects against the Firebase Emulator.

## Phase 5: Move Score Events Out

Introduce:

```txt
rooms_v3/{roomId}/rounds/{roundId}/scoreEvents/{eventId}
  playerId
  delta
  reason
  details
  timestamp
```

Keep score totals on player documents:

```txt
rooms_v3/{roomId}/players/{playerId}
  score
```

Score events become append-only audit records. Endgame score animations can subscribe to score events only when needed.

### Phase 5 Tests

- Score events are appended instead of stored on the room/round document.
- Player score totals update with expected increments.
- Score event ordering is stable enough for animation.
- New rounds clear or scope score events correctly.
- Score breakdown UI can render from score event collection data.

## Phase 6: Add Real Presence

Use Firebase Realtime Database for ephemeral online status:

```txt
/status/{roomId}/{playerId}
  state
  lastChanged
```

Use RTDB `onDisconnect()` to mark players offline.

Firestore remains the durable source for room membership. RTDB only answers "who is online right now?"

### Phase 6 Tests

Use the RTDB emulator.

- Player connects and appears online.
- Player disconnect triggers `onDisconnect`.
- Firestore membership remains even when RTDB presence changes.
- UI treats offline players differently from removed players.
- Reconnecting restores online status.

## Phase 7: Move Critical Game Logic Server-Side

After v3 is stable, move high-authority actions into Cloud Functions or another trusted backend:

- `createRoom`
- `joinRoom`
- `startGame`
- `setSecretWord`
- `addSignull`
- `submitConnect`
- `submitDirectGuess`
- `endRound`

The client sends intents. The backend validates phase, role, duplicate submissions, scoring, winner calculation, and writes canonical state.

Example:

```ts
submitConnect({
  roomId,
  roundId,
  signullId,
  guess
});
```

The backend handles:

- Is player in room?
- Is phase `signulls`?
- Is Signull pending?
- Has this player already connected?
- Is the guess correct?
- Does this resolve, block, fail, or end the game?
- What score changes apply?

### Phase 7 Tests

Add function-level tests:

- Unauthorized user cannot mutate a room they are not in.
- Non-setter cannot set secret word.
- Non-host cannot change settings or start the game.
- Invalid phase transitions are rejected.
- Duplicate connect submissions are rejected.
- Scoring is deterministic and idempotent.
- Retrying the same request does not double-score.
- Callable functions work from the client SDK in the emulator.

## Phase 8: Cleanup And Retention

Add lifecycle rules:

- Expire abandoned rooms.
- Archive completed rounds.
- Keep recent round summaries on room documents.
- Delete or cold-store stale detailed event data.
- Add scheduled cleanup for rooms with no active players.

Firestore TTL policies or scheduled Cloud Functions are good fits.

### Phase 8 Tests

- Abandoned rooms are eligible for cleanup.
- Active rooms are not deleted.
- Completed rounds are archived with enough data for memories/history.
- Cleanup does not remove current-round hot state.
- Scheduled cleanup can run idempotently.

## UI Smoke Tests

Use Playwright for critical real-time browser flows.

Recommended test:

```txt
create room
join room in second browser context
join room in third browser context
see same lobby
start game
setter enters word
guessers see revealed letters
guesser sends Signull
other players see Signull
connect submission updates card/status
game reaches an end condition
endgame card appears consistently
```

Useful assertions:

- Room code appears for all clients.
- Player list is synchronized.
- Phase navigation happens automatically.
- Secret word is not visible to guessers.
- Signull card appears on other clients.
- Revealed letters update after resolution.
- Endgame card appears consistently.

Even though the current beta lobby requires at least three players to start, Playwright can launch three browser contexts for this flow.

## Recommended Test Pyramid

```txt
Many:
  pure unit tests for scoring, selectors, and state composition

Some:
  Firebase Emulator tests for transactions and data shape

Few but critical:
  Playwright multi-client real-time tests
```

## Expected Files To Add

```txt
frontend/src/lib/beta/v3/types.ts
frontend/src/lib/beta/v3/firebase.ts
frontend/src/lib/beta/v3/composeGameState.ts

frontend/src/lib/beta/v3/__tests__/composeGameState.test.ts
frontend/src/lib/beta/v3/__tests__/firebase.room.test.ts
frontend/src/lib/beta/v3/__tests__/firebase.signulls.test.ts
frontend/src/lib/beta/v3/__tests__/realtime.test.ts

frontend/e2e/beta-realtime.spec.ts
```

## Suggested Migration Order In Code

1. Add v3 types.
2. Add v3 Firebase read/write helpers.
3. Add a v3 store adapter that still exposes a `GameState`-like object.
4. Add a feature flag or route switch for v3 rooms.
5. Migrate create/join/lobby first.
6. Migrate setting the secret word.
7. Migrate Signulls/connects.
8. Migrate direct guesses, endgame, and scoring.
9. Add presence.
10. Move validation and scoring to Cloud Functions.

## Regression Checklist Before Enabling V3 By Default

- Run Vitest unit tests.
- Run Firebase Emulator integration tests.
- Run Playwright three-player game flow.
- Manually test one full game locally.
- Verify old v2 rooms still work if backwards compatibility remains.
- Verify new v3 rooms do not write to `game_rooms_v2`.
- Verify Firestore security rules match the new paths.
- Verify secret-word access is handled intentionally.
- Verify cleanup jobs do not affect active rooms.

## Core Principle

Every schema split should include a test proving the UI still sees the same logical game state.

Keep shared canonical documents small, split append-heavy events into collections, and move rule enforcement server-side when trust or concurrency starts to matter.
