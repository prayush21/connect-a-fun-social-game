# Notification Sounds

This directory contains audio files for game notifications.

## Required Sound Files:

### Signull Events

- `signull-sent.mp3` - Played when you send a Signull
- `signull-received.mp3` - Played when another player sends a Signull
- `signull-resolved.mp3` - Played when a Signull is resolved
- `signull-intercepted.mp3` - Played when setter intercepts a Signull
- `signull-failed.mp3` - Played when a Signull fails

### Connect Events

- `connect-sent.mp3` - Played when you send a connect
- `connect-received.mp3` - Played when someone connects to a Signull

### Game State Events

- `game-start.mp3` - Played when a game starts
- `game-end-win.mp3` - Played when guessers win
- `game-end-lose.mp3` - Played when setter wins
- `letter-revealed.mp3` - Played when a letter is revealed
- `direct-guess-correct.mp3` - Played for correct direct guess
- `direct-guess-wrong.mp3` - Played for wrong direct guess

### Player Events

- `player-joined.mp3` - Played when a player joins
- `player-left.mp3` - Played when a player leaves

### UI/Feedback Sounds

- `button-click.mp3` - Generic button click sound
- `error.mp3` - Error notification
- `success.mp3` - Success notification
- `new-clue.mp3` - General notification (fallback)

## Audio Requirements:

- Format: MP3 or OGG for broad browser support
- Duration: 0.5-2 seconds (short and non-intrusive)
- Volume: Normalized to prevent overly loud notifications
- File size: Keep under 50KB each for fast loading

## Sourcing Audio:

You can:

1. Use free sound libraries like Freesound.org or Zapsplat
2. Generate simple tones using audio software
3. Use AI audio generators
4. Record your own sounds

## Sound Preferences:

Players can control sounds via the Settings panel in the lobby:

- **Enable/Disable**: Master toggle for all sounds
- **Volume**: 0-100% volume control
- **Mode**: "All" (all sounds) or "Important" (only critical game events)

Sounds are stored in localStorage and persist across sessions.

## Current Status:

⚠️ **Most audio files need to be added manually**

The notification system is implemented but requires actual audio files to be placed in this directory.

Currently available:

- ✅ `new-clue.mp3`

Missing files will be gracefully handled (no errors, just no sound).
