## Room & Player Management

### Room creator can remove users

**User Story**
As the room creator, I want to remove any player from my room so that I can keep the game fair or remove disruptive users.

**Acceptance Criteria**

1. A “Remove” (🗑️) button appears next to every other player’s name only for the creator.
2. Clicking the button opens a confirmation dialog (Yes / Cancel).
3. On confirmation:
   - The player’s document is deleted from `players` in Firestore.
   - The kicked player immediately sees a message “You were removed from the room” and is redirected to the Lobby.
4. Remaining players’ lists update in real-time.
5. The remove button will be availble to the room creator in the lobby as well as during the game(in some modal with people icon button to access the modal on top right)

---

### Room creator can update user roles

**User Story**
As the room creator, I want to change a player’s role (Setter ↔ Guesser) so that gameplay remains flexible.

**Acceptance Criteria**

1. The creator sees a “Change Role” dropdown next to each player.
2. Only one player can hold the "setter" role at any time; selecting Setter for someone automatically demotes the current Setter to Guesser.
3. Role changes update instantly in Firestore and all clients’ UIs.
4. If the game is mid-round, role changes are disabled with a tooltip explaining why.

---

### Only one setter in the game

**User Story**
As a developer, I want the backend to enforce that exactly one player has the “setter” role, even during reconnects, to maintain data consistency.

**Acceptance Criteria**

1. Firestore security rules reject any write that would result in 0 or >1 setters.
2. On client reconnect, if multiple setters are detected, the server resolves by keeping the earliest `timestamp` setter and demoting the rest.
3. Automated test (rules simulator) covers this scenario.

---

### Persistent user sessions

**User Story**
As a returning player, I want my identity to persist across page refreshes so that I keep my role and stats.

**Acceptance Criteria**

1. Firebase Anonymous Auth initialises on page load.
2. After refresh, the same UID is restored and the client re-joins the room it was last in (if still active).
3. The player’s chosen name is remembered in `localStorage` and automatically repopulated.

---

### Re-join active room & recover state

**User Story**
As a player who accidentally disconnects, I want to re-enter the room and resume my role without causing duplicate entries.

**Acceptance Criteria**

1. On load, if `localStorage.roomId` exists, the client attempts to re-attach to that room.
2. If the UID still exists in `players`, its state is reused; otherwise, it’s re-added.
3. Turn counters and direct-guess counts are preserved; UI reflects the current phase.
4. If the game has already ended, the player is taken directly to the End-of-Round modal.

---

### Auto-populate room code from URL

**User Story**
As a new player receiving a game invitation link, I want the room code to be automatically filled in when I open the link so that I can join the game quickly without manually entering the code.

**Acceptance Criteria**

1. The copy room code button generates and copies a full shareable URL with the room code as a URL parameter (e.g., `https://yoursite.com/?room=ABC123`).
2. When a user opens a URL containing a room code parameter, the join game input field is automatically populated with that room code.
3. The "Join Game" button is enabled when a room code is auto-populated from the URL.
4. Users can still modify their randomly generated nickname before joining the game.
5. If the room code in the URL is invalid or the room doesn't exist, show an appropriate error message but keep the code in the input field for user reference.
6. The URL parameter should be case-insensitive and handle common formatting variations.

---

## UI & User Experience

### Info Modal with How to Play

**User Story**
As a new player, I want to quickly understand how to play the game so that I can participate effectively without confusion.

**Acceptance Criteria**

1. A small info button (ℹ️) appears next to the game title "Reference Point" in the lobby.
2. Clicking the info button opens a clean, mobile-friendly modal with the title "How to Play".
3. The modal displays a 4-step gameplay summary with the following content:
   - **Step 1: Setup 🎯** - "One player becomes the Word Setter and chooses a secret word. Everyone else becomes Guessers."
   - **Step 2: Give Clues 💡** - "Guessers take turns being the Clue Giver. They think of a reference word that fits the revealed letters and give a clue."
   - **Step 3: Match & Reveal 🔍** - "Other Guessers try to guess the same reference word. If they match (and beat the Setter), a new letter is revealed!"
   - **Step 4: Win the Game 🏆** - "Guessers win by revealing the full word or making a correct direct guess. Setter wins by blocking them!"
4. Each step includes:
   - A relevant emoji icon
   - Progress dots showing the current step (1→2→3→4)
   - Clear, concise description text
5. The modal has:
   - Clean typography with good contrast
   - A "Got it!" or "Close" button to dismiss the modal
   - Responsive design that works well on mobile devices
   - Smooth open/close transitions
6. The modal can be closed by:
   - Clicking the close button
   - Clicking outside the modal
   - Pressing the Escape key

---

## Analytics & Metrics

### Basic analytics instrumentation

**User Story**
As the product owner, I want to log key funnel events and unique user sessions so that we understand core traction and retention for the MVP.

**Acceptance Criteria**

1. GA4 custom events `game_created`, `game_started`, `game_ended`, and `app_session` are triggered from the client.
2. Each event includes these parameters:
   - `room_id` – the 6-char code
   - `players_count` – current number of players (when applicable)
   - `round_number` – for `game_started` and `game_ended`
3. Events appear in the Firebase Analytics DebugView during development and in standard GA4 reports in production.

---

### Round tracking analytics

**User Story**
As the product owner, I want to measure how many rounds are played per game, including partially completed rounds, so that we can gauge engagement depth.

**Acceptance Criteria**

1. Firestore field `roundNumber` increments every time the Word Setter submits a new secret word.
2. The `round_number` parameter is included in both `game_started` and `game_ended` events.
3. We can compute average and median rounds per game in GA4 or BigQuery.

---

### Player count analytics

**User Story**
As the design team, we want insight into party sizes (3-18 players) so that UI and performance decisions are data-driven.

**Acceptance Criteria**

1. The `players_count` parameter is logged with each `game_started` and `game_ended` event.
2. Values outside the 3-18 range trigger a console warning for investigation.
3. GA4 distribution report shows the frequency of each player count bucket.
