# Signull CLI

Interactive REPL for AI agents and players to play the Signull word game from the command line.

## Quick Start

```bash
# From the frontend directory
cd cli

# Install dependencies
pnpm install

# Run in development mode
pnpm dev
```

## Features

- **Session persistence**: Resume games after terminal restart
- **AI-friendly output**: Consistent `[INFO]`, `[ERROR]`, `[SUCCESS]` prefixes
- **Full game support**: All player actions (create signulls, connect, guess, intercept)
- **Rate limiting ready**: Extendable configuration for future rate limiting

## Commands

### Session Commands

| Command                | Description                       |
| ---------------------- | --------------------------------- |
| `create [name]`        | Create a new room (become setter) |
| `join <roomId> [name]` | Join an existing room             |
| `leave`                | Leave current room                |
| `resume`               | Resume from saved session         |
| `session`              | Show current session info         |

### Game Commands

| Command    | Description                                 |
| ---------- | ------------------------------------------- |
| `status`   | Show full game state (excludes secret word) |
| `players`  | List all players                            |
| `signulls` | List all signulls                           |
| `start`    | Start the game (from lobby)                 |

### Guesser Actions

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `signull <word> <clue>` | Create a signull             |
| `connect <id> <guess>`  | Guess a signull's word       |
| `guess <word>`          | Direct guess the secret word |

### Setter Actions

| Command                  | Description            |
| ------------------------ | ---------------------- |
| `setword <word>`         | Set the secret word    |
| `intercept <id> <guess>` | Try to block a signull |

### Other

| Command         | Description         |
| --------------- | ------------------- |
| `help`          | Show help message   |
| `quit` / `exit` | Leave room and exit |

## Configuration

The CLI reads Firebase configuration from environment variables. It supports both:

- `NEXT_PUBLIC_FIREBASE_*` (from frontend's `.env.local`)
- `FIREBASE_*` (non-prefixed)

### Required Environment Variables

```
FIREBASE_API_KEY (or NEXT_PUBLIC_FIREBASE_API_KEY)
FIREBASE_AUTH_DOMAIN (or NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)
FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)
FIREBASE_APP_ID (or NEXT_PUBLIC_FIREBASE_APP_ID)
```

## Session Persistence

Sessions are saved to `~/.signull/session.json` and include:

- Room ID
- Player ID
- Username
- Role (setter/guesser)
- Timestamps

Use `resume` command to continue a saved session after terminal restart.

## For AI Agents (Gemini CLI, etc.)

The CLI is designed to be AI-friendly:

1. **Consistent output format**: All messages are prefixed with `[INFO]`, `[ERROR]`, `[SUCCESS]`, or `[UPDATE]`
2. **Structured status**: Use `status` command to get full game state
3. **Explicit state polling**: Game state updates only on explicit `status` command (no real-time noise)
4. **Session persistence**: AI can resume games after restart using `resume` command

### Example AI Session

```
signull > create AIPlayer
[INFO] Creating room BAKU34...
[SUCCESS] Room BAKU34 created! You are the setter.

signull [BAKU34] [setter] > status
╔═══════════════════════════════════════════════════════════════╗
║                        GAME STATUS                            ║
...

signull [BAKU34] [setter] > setword ELEPHANT
[SUCCESS] Secret word set! (8 letters)

signull [BAKU34] [setter] > status
...
```

## Rate Limiting (Extendable)

The CLI configuration supports rate limiting options (not yet implemented):

```typescript
rateLimit: {
  minDelayMs?: number;           // Min delay between commands
  maxCommandsPerMinute?: number; // Max commands per minute
}
```

## Development

```bash
# Type check
pnpm typecheck

# Build
pnpm build

# Run built version
pnpm start
```
