# Connect: The TV Experience

## Core Concept

Connect is a social, turn-based word game designed for a shared-screen experience, making it perfect for parties, family gatherings, and hangouts. The game is played on a central screen (like a TV or a projector), and each player uses their smartphone as a personal controller. This dual-screen approach keeps the main screen clean and focused on the shared game state, while individual actions and secret information are handled privately on each player's device.

The game revolves around two teams: the **Connectors** (Guessers) and the **Word Master** (the Setter). The Connectors work together to guess a secret word, while the Word Master tries to block them.

## Visuals & Sound

The game aims for a modern, clean, and vibrant "game show" aesthetic.

*   **Theme:** A polished and professional look and feel, with smooth animations, satisfying sound effects, and a clear, easy-to-read font. The color palette should be bright and engaging.
*   **TV Display:** The main screen is the centerpiece of the game. It displays:
    *   The game board with the partially revealed secret word (e.g., `_ P P _ _`).
    *   The current clue word.
    *   The avatars of all players in the game.
    *   The current game state (e.g., "Player X is thinking of a clue...").
    *   A timer for each round.
*   **Controller (Smartphone):** The web app on each player's phone is their private interface. It's designed to be simple and intuitive, with a focus on the current action.

## Gameplay Flow

### 1. Lobby & Setup

*   A unique room code and a QR code are displayed on the TV screen.
*   Players join the game by either scanning the QR code or entering the room code on a specific website on their smartphones.
*   On their phones, players enter their name and choose an avatar. As they join, their avatars pop up on the TV screen in the lobby.
*   The first player to join is designated as the "Host" and has the ability to start the game once all players are in.

### 2. Role Assignment

*   At the beginning of each round, one player is randomly selected to be the **Word Master**. All other players are **Connectors**.
*   The Word Master is prompted on their phone to secretly type in a word. This word becomes the secret word for the round.

### 3. The "Connect" Round

*   One Connector is chosen as the **Clue Giver** for the turn.
*   The Clue Giver sees the partially revealed secret word on their phone (e.g., `_ P P _ _`) and is prompted to enter a one-word clue.
*   The clue appears on the TV screen for all players to see.
*   The other Connectors, as well as the Word Master, secretly enter their guess for the *clue word* on their phones.

### 4. The Reveal

*   All the guesses are revealed on the TV screen at the same time, creating a moment of suspense and excitement.
*   **If a majority of Connectors guess the clue word correctly:**
    *   A new letter of the secret word is revealed on the TV with a satisfying animation and sound effect.
*   **If the Word Master also guessed the clue word correctly:**
    *   The Word Master "blocks" the Connectors, and no letter is revealed. This adds a layer of strategy for the Word Master.

### 5. Winning the Game

*   **Connectors Win:** By revealing the entire secret word.
*   **Word Master Wins:** By successfully blocking the Connectors for a set number of rounds (e.g., 10 rounds).

## Special "Super Connect" Moment

*   If the Clue Giver's clue is the *exact same* as the secret word, a "Super Connect" round is triggered.
*   The TV screen flashes, and a special message is displayed, building excitement.
*   If all other Connectors guess the word correctly, they win the game instantly. The Word Master cannot block in this special round.

## Controller App (on phones)

The controller app is a key part of the experience and is designed to be as simple and intuitive as possible.

*   **Simple & Focused:** The screen on each player's phone only shows what is necessary for the current action. For example, when it's a player's turn to enter a word, their screen will show a text input field and a "Submit" button.
*   **Private Information:** The controller app is used to manage secret information. The Word Master sees the full secret word on their phone, while the Connectors only see the partially revealed word.
*   **Haptic Feedback:** The phone vibrates to confirm actions (e.g., when a guess is submitted) and to notify players when it's their turn to act.

## Why This Works for TV

*   **Shared Experience:** The main action unfolds on the big screen, encouraging social interaction, laughter, and conversation among players.
*   **Simple Controls:** By using smartphones as controllers, the game avoids the need for physical remotes and allows players to use a device they are already familiar with.
*   **Reduced Clutter:** The TV screen is kept clean and focused on the game state, while individual actions and inputs are handled on personal devices. This creates a more polished and professional look.
*   **Scalable:** The game can easily support a large number of players without cluttering the UI. New players can join in seconds by scanning the QR code.