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
4. If the game is mid-round, role changes are disabled.

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

## Game Logic

### Reference word equals secret word

**User Story**
As a player, I want the game to create a climactic moment when the clue giver's reference word is the same as the secret word, so that guessers can achieve an immediate victory if they reach consensus.

**Acceptance Criteria**

1. When the clue giver submits a reference word that exactly matches the secret word (case-insensitive), the game enters a special "climactic" mode.
2. The word setter's guess input field is disabled and shows a tooltip/message: "You cannot intercept when the reference word matches the secret word."
3. Once all active guessers have locked in their guesses with "I Know It!", the system checks if a majority guessed the reference word correctly.
4. If the majority correctly guesses the reference word (which is the secret word):
   - All guessers immediately win the round
   - A special victory message displays to the guesser's: "🎉 The reference word IS the secret word! You won! 🎉"
   - The word setter sees the message: "Guessers Won! Round Over."
   - The secret word is revealed in its entirety
   - The game proceeds to the end-of-round modal
5. If the majority fails to guess correctly or time runs out, the victory message to the guesser's go as "🎉 The reference word IS the secret word! Guessers Won!🎉".
6. The word setter cannot make any guess attempts during this climactic reference round.
7. The UI clearly indicates to all players that this is a special situation (e.g., different visual styling, special indicator).

---

### Prefix validation for guesses

**User Story**
As a player, I want the game to validate that my reference words and direct guesses start with the same letters that have been revealed from the secret word, so that the game maintains logical consistency and prevents invalid attempts.

**Acceptance Criteria**

1. **Reference Word Validation:**

   - When a clue giver submits a reference word, the system checks if it starts with the revealed prefix of the secret word (case-insensitive).
   - If the reference word doesn't match the revealed prefix, show an error message: "Your reference word must start with '[REVEALED_PREFIX]'" and prevent submission.
   - The input field remains focused and the user can correct their entry.

2. **Direct Guess Validation:**

   - When any guesser submits a direct guess, the system validates it starts with the revealed prefix of the secret word (case-insensitive).
   - If the direct guess doesn't match the revealed prefix, show an error message: "Your guess must start with '[REVEALED_PREFIX]'" and prevent submission.
   - The direct guess counter is not decremented for invalid attempts.

3. **Visual Feedback:**

   - Error messages appear immediately below the respective input fields with red styling.
   - Error messages automatically clear when the user starts typing again.
   - The submit button remains disabled while there's a validation error.

4. **Edge Cases:**

   - Validation works correctly when only one letter is revealed (e.g., "E**\_**").
   - Validation handles multiple revealed letters (e.g., "EL\_\_\_\_").
   - Empty or whitespace-only inputs show appropriate validation messages.
   - Validation is performed both on the client side (for immediate feedback) and server side (for security).

5. **User Experience:**
   - Clear visual indication of what the current revealed prefix is (displayed prominently in the game UI).
   - Helpful placeholder text in input fields showing the required prefix (e.g., "Enter word starting with 'EL...'").

---

### Configurable majority threshold

**User Story**
As a word setter (room creator), I want to customize how many guessers need to click "I Know It" before the game checks reference word matches, so that I can adjust the game difficulty and flow based on my group's preferences and size.

**Acceptance Criteria**

1. **Lobby Configuration UI:**

   - In the game lobby, below the players list, the word setter sees a configuration section titled "Game Settings".
   - A horizontal slider labeled "Guessers needed to proceed: X of Y" where X is the selected threshold and Y is the current number of available guessers (excluding clue giver).
   - The slider ranges from minimum 1 to maximum available guessers count.
   - Default value is Math.ceil(availableGuessers / 2) to maintain current majority behavior.
   - Real-time preview shows "X out of Y guessers must click 'I Know It' to check answers".

2. **Dynamic Range Adjustment:**

   - As players join/leave the lobby, the slider's maximum value automatically updates to reflect available guessers.
   - If the current threshold becomes impossible (e.g., set to 4 but only 2 guessers available), it auto-adjusts down to the maximum possible value.
   - Visual feedback shows when auto-adjustment occurs with a brief highlight or tooltip.

3. **Data Storage & Persistence:**

   - The threshold is stored as `majorityThreshold` field in the Firestore game document.
   - Setting persists across game rounds until explicitly changed.
   - Only updates when game is in lobby phase to prevent mid-game rule changes.

4. **Visibility & Communication:**

   - All players in lobby see the current setting displayed as "Game requires X of Y guessers to agree".
   - Non-setters see the setting as read-only information, not an interactive control.
   - During gameplay, the current threshold is visible in the game UI (e.g., in the players panel or status area).

5. **Game Logic Integration:**

   - Replace the hardcoded `Math.ceil(activeGuesserIds.length / 2)` majority calculation with the configured threshold.
   - Apply to both normal reference rounds and climactic rounds.
   - Game history messages include participation information: "Success! (3/5 required, 4/7 total guessers participated)".

6. **Edge Case Handling:**

   - Minimum threshold of 1 ensures game can always proceed even with very small groups.
   - If all active guessers leave/disconnect mid-round, auto-adjust threshold to remaining count.
   - Handle reconnections gracefully without breaking the threshold logic.
   - If word setter changes roles mid-lobby, new setter inherits current threshold setting.

7. **User Experience:**

   - Slider has clear visual markers and smooth interaction.
   - Tooltip explains the impact: "Lower = faster games, Higher = more consensus required".
   - Mobile-friendly touch interaction for the slider.
   - Setting changes are immediately reflected in the preview text.

8. **Analytics Integration:**
   - Track threshold selection in `game_created` analytics events as `majority_threshold` parameter.
   - Monitor how different thresholds affect game completion rates and satisfaction.

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
2. Events are prefixed with environment: `dev_*` for localhost/development and `prod_*` for production to prevent data mixing.
3. Each event includes these parameters:
   - `room_id` – the 6-char code
   - `players_count` – current number of players (when applicable)
   - `round_number` – for `game_started` and `game_ended`
   - `environment` – 'dev' or 'prod' for additional filtering
4. Events appear in the Firebase Analytics DebugView during development and in standard GA4 reports in production.

---

### Round tracking analytics

**User Story**
As the product owner, I want to measure how many rounds are played per game, including partially completed rounds, so that we can gauge engagement depth.

**Acceptance Criteria**

1. Firestore field `roundNumber` increments every time the Word Setter submits a new secret word.
2. The `round_number` parameter is included in both `game_started` and `game_ended` events.
3. Events are prefixed with environment (`dev_*` or `prod_*`) and include `environment` parameter to prevent data mixing.
4. We can compute average and median rounds per game in GA4 or BigQuery.

---

### Player count analytics

**User Story**
As the design team, we want insight into party sizes (3-18 players) so that UI and performance decisions are data-driven.

**Acceptance Criteria**

1. The `players_count` parameter is logged with each `game_started` and `game_ended` event.
2. Events are prefixed with environment (`dev_*` or `prod_*`) and include `environment` parameter to prevent data mixing.
3. Values outside the 3-18 range trigger a console warning for investigation.
4. GA4 distribution report shows the frequency of each player count bucket.

## Feedback & Surveys

### End-of-Round Satisfaction Survey

**User Story**  
As a player, I want to quickly rate my satisfaction at the end of each round so that the team can spot issues and improve the game.

**Acceptance Criteria**

1. Immediately after the “Round Over” modal, a survey modal appears (sampled 1-in-5 sessions or once per user per day).
2. The survey contains:
   - CES scale 1-7 (“How satisfied are you with this round?”).
   - Optional open text “One thing we should fix”.
3. Submit button is disabled until a scale value is chosen.
4. On submit:
   - A document is added to `round_feedback` with `roomId`, `roundNumber`, `winner`, `rating`, `comment`, `createdAt`, `userId` (or `null`), `sessionId`.
   - The modal closes and a “Thanks for the feedback!” toast appears.
5. Survey will not be shown again in the same browser for 24 h.
6. Firestore security rules allow `create` only; clients cannot read or update feedback docs.

---

### Floating Feedback Button

**User Story**  
As any player, I want a persistent button to send feedback or report a bug at any time so that issues can be captured while they are fresh.

**Acceptance Criteria**

1. A circular “💬” button is fixed to the bottom-right corner on every view (desktop & mobile).
2. Clicking the button opens a modal with:
   - Category dropdown: Bug, Idea, Confusing.
   - Multiline message box (min 10 characters).
   - "Send" button (disabled until category & message provided).
3. On send:
   - A document is created in `feedback_detailed` with `category`, `message`, `createdAt`, `userAgent`, `gamePhase`, `roomId`, `userId`, `sessionId`.
   - Modal closes and success toast appears.
4. If Cloud Function forwarding is enabled, the function posts a summary to Slack `#player-feedback`.
5. Works on small screens and remains keyboard accessible (focus trap & Esc to close).

---

### UX Pain-Point Analytics

**User Story**  
As the product owner, I want passive analytics that log “rage clicks”, uncaught JS errors, and time spent in each funnel step so that I can discover UX friction without extra user effort.

**Acceptance Criteria**

1. Rage-click detection:
   - If a user clicks the same element ≥4 times within 2 s, log event `rage_click` with `element`, `clicks`, `sessionId`.
2. Funnel instrumentation:
   - Emit `funnel_step` events on transitions to `lobby`, `setting_word`, `guessing`, `ended` with `timestamp` and `sessionId`.
3. All events are sent through existing `logAnalyticsEvent`, prefixed with environment (`dev_` / `prod_`).
4. Events appear in GA4 DebugView locally; in production they aggregate in standard reports.
5. No personally identifiable information (PII) is included in payloads.
