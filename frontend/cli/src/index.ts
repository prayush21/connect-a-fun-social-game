#!/usr/bin/env node
/**
 * Signull CLI - Entry Point
 *
 * Interactive REPL for AI agents to play the Signull game.
 * Supports session persistence for resuming games after terminal restart.
 *
 * Usage:
 *   pnpm dev              # Run in development mode
 *   signull               # Run after building
 *   signull --help        # Show help
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load environment variables from frontend's .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../.env.local");
config({ path: envPath });

// Also try loading from cli's own .env if it exists
config({ path: resolve(__dirname, "../.env") });

import type { CLIConfig, CLISession, GameStatusOutput } from "./types.js";
import {
  loadSession,
  saveSession,
  clearSession,
  createSession,
} from "./session.js";
import {
  initializeAuth,
  generateRoomCode,
  createRoom,
  joinRoom,
  leaveRoom,
  getGameState,
  checkRoomExists,
  setSecretWord,
  addSignull,
  submitConnect,
  submitDirectGuess,
  interceptSignull,
  startGame,
  changeSetter,
  gameStateToStatusOutput,
} from "./firebase-adapter.js";

// ==================== CLI Configuration ====================

const DEFAULT_CONFIG: CLIConfig = {
  outputFormat: "text",
  sessionFilePath: "", // Uses default ~/.signull/session.json
  rateLimit: {
    // Extendable - no values set for now
    minDelayMs: undefined,
    maxCommandsPerMinute: undefined,
  },
};

// ==================== Output Helpers ====================

const output = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
  success: (message: string) => console.log(`[SUCCESS] ${message}`),
  state: (data: unknown) => {
    if (DEFAULT_CONFIG.outputFormat === "json") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  },
  prompt: () => {
    const session = currentSession;
    if (session) {
      process.stdout.write(
        `\nsignull [${session.roomId}] [${session.role}] > `
      );
    } else {
      process.stdout.write("\nsignull > ");
    }
  },
};

// ==================== Session State ====================

let currentSession: CLISession | null = null;
let currentPlayerId: string | null = null;

// ==================== Signull Index Map ====================
// Maps shorthand numbers (1, 2, 3...) to full signull IDs for quick reference
let signullIndexMap: Map<number, string> = new Map();

/**
 * Update the signull index map based on current signulls
 * Called after fetching signulls to enable shorthand references
 */
function updateSignullIndexMap(signulls: { id: string }[]): void {
  signullIndexMap.clear();
  signulls.forEach((s, idx) => {
    signullIndexMap.set(idx + 1, s.id); // 1-indexed for user convenience
  });
}

/**
 * Resolve a signull reference - can be a number (shorthand) or full ID
 */
function resolveSignullId(ref: string): string | null {
  // Check if it's a number (shorthand)
  const num = parseInt(ref, 10);
  if (!isNaN(num) && signullIndexMap.has(num)) {
    return signullIndexMap.get(num)!;
  }

  // Otherwise treat as full or partial ID
  // Check for exact match first
  for (const id of signullIndexMap.values()) {
    if (id === ref) return id;
  }

  // Check for partial match (starts with)
  for (const id of signullIndexMap.values()) {
    if (id.startsWith(ref)) return id;
  }

  return ref; // Return as-is, let Firebase handle validation
}

// ==================== Command Handlers ====================

const commands: Record<string, (args: string[]) => Promise<void>> = {
  help: async () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    SIGNULL CLI - COMMANDS                     ║
╠═══════════════════════════════════════════════════════════════╣
║  SESSION COMMANDS                                             ║
║    create [name]        Create a new room (become setter)     ║
║    join <roomId> [name] Join an existing room                 ║
║    leave                Leave current room                    ║
║    resume               Resume from saved session             ║
║    session              Show current session info             ║
║                                                               ║
║  GAME COMMANDS                                                ║
║    status               Show full game state                  ║
║    players              List all players                      ║
║    signulls [filter]    List signulls (all/active/pending)    ║
║    start                Start the game (host only)            ║
║                                                               ║
║  GUESSER ACTIONS                                              ║
║    signull <word> <clue>     Create a signull                 ║
║    connect <#|id> <guess>    Guess a signull's word           ║
║    guess <word>              Direct guess the secret word     ║
║                                                               ║
║  SETTER ACTIONS                                               ║
║    setword <word>            Set the secret word              ║
║    intercept <#|id> <guess>  Try to block a signull           ║
║    changesetter <name>       Change setter to another player  ║
║                                                               ║
║  OTHER                                                        ║
║    help                 Show this help message                ║
║    quit / exit          Leave room and exit                   ║
╚═══════════════════════════════════════════════════════════════╝
`);
  },

  create: async (args) => {
    if (!currentPlayerId) {
      output.error("Not authenticated. Please wait for initialization.");
      return;
    }

    const username = args[0] || `Player${Math.floor(Math.random() * 1000)}`;
    const roomId = generateRoomCode();

    output.info(`Creating room ${roomId}...`);

    const result = await createRoom(roomId, currentPlayerId, username);
    if (!result.success) {
      output.error(result.error?.message || "Failed to create room");
      return;
    }

    currentSession = createSession(roomId, currentPlayerId, username, "setter");
    saveSession(currentSession);

    output.success(`Room ${roomId} created! You are the setter.`);
    output.info(`Share this room code with other players: ${roomId}`);
  },

  join: async (args) => {
    if (!currentPlayerId) {
      output.error("Not authenticated. Please wait for initialization.");
      return;
    }

    if (args.length < 1) {
      output.error("Usage: join <roomId> [username]");
      return;
    }

    const roomId = args[0].toUpperCase();
    const username = args[1] || `Player${Math.floor(Math.random() * 1000)}`;

    output.info(`Joining room ${roomId}...`);

    const exists = await checkRoomExists(roomId);
    if (!exists.success || !exists.data) {
      output.error("Room does not exist");
      return;
    }

    const result = await joinRoom(roomId, currentPlayerId, username);
    if (!result.success) {
      output.error(result.error?.message || "Failed to join room");
      return;
    }

    currentSession = createSession(
      roomId,
      currentPlayerId,
      username,
      result.data!.role
    );
    saveSession(currentSession);

    output.success(`Joined room ${roomId} as ${result.data!.role}`);
  },

  leave: async () => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    output.info("Leaving room...");

    await leaveRoom(currentSession.roomId, currentSession.playerId);
    clearSession();
    currentSession = null;

    output.success("Left room");
  },

  resume: async () => {
    const { session, error } = loadSession();

    if (error) {
      output.error(error);
      return;
    }

    if (!session) {
      output.info("No saved session found. Use 'create' or 'join' to start.");
      return;
    }

    output.info(`Found session for room ${session.roomId}...`);

    // Verify room still exists
    const exists = await checkRoomExists(session.roomId);
    if (!exists.success || !exists.data) {
      output.error("Saved room no longer exists. Session cleared.");
      clearSession();
      return;
    }

    // Re-authenticate if needed
    if (!currentPlayerId) {
      const authResult = await initializeAuth();
      if (!authResult.success) {
        output.error("Authentication failed");
        return;
      }
      currentPlayerId = authResult.data!;
    }

    // Try to rejoin with stored player ID
    const result = await joinRoom(
      session.roomId,
      session.playerId,
      session.username
    );
    if (!result.success) {
      output.error(`Failed to resume: ${result.error?.message}`);
      clearSession();
      return;
    }

    currentSession = {
      ...session,
      role: result.data!.role,
      lastActiveAt: new Date().toISOString(),
    };
    saveSession(currentSession);

    output.success(
      `Resumed session in room ${session.roomId} as ${result.data!.role}`
    );
  },

  session: async () => {
    if (!currentSession) {
      output.info("No active session. Use 'create', 'join', or 'resume'.");
      return;
    }

    console.log(`
Session Info:
  Room ID:    ${currentSession.roomId}
  Player ID:  ${currentSession.playerId}
  Username:   ${currentSession.username}
  Role:       ${currentSession.role}
  Created:    ${currentSession.createdAt}
  Last Active: ${currentSession.lastActiveAt}
`);
  },

  status: async () => {
    if (!currentSession) {
      output.error("Not in a room. Use 'join' or 'create' first.");
      return;
    }

    const result = await getGameState(currentSession.roomId);
    if (!result.success) {
      output.error(result.error?.message || "Failed to get game state");
      return;
    }

    const state = result.data!;
    const status = gameStateToStatusOutput(state, currentSession.playerId);

    // Update session role in case it changed
    const myPlayer = state.players[currentSession.playerId];
    if (myPlayer && myPlayer.role !== currentSession.role) {
      currentSession.role = myPlayer.role;
      saveSession(currentSession);
    }

    printGameStatus(status);
  },

  players: async () => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    const result = await getGameState(currentSession.roomId);
    if (!result.success) {
      output.error(result.error?.message || "Failed to get game state");
      return;
    }

    const state = result.data!;
    console.log("\n=== PLAYERS ===");
    for (const player of Object.values(state.players)) {
      const isMe = player.id === currentSession.playerId ? " (you)" : "";
      const online = player.isOnline ? "🟢" : "⚪";
      console.log(
        `  ${online} ${player.name}${isMe} - ${player.role} - Score: ${player.score}`
      );
    }
  },

  signulls: async (args) => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    const result = await getGameState(currentSession.roomId);
    if (!result.success) {
      output.error(result.error?.message || "Failed to get game state");
      return;
    }

    const status = gameStateToStatusOutput(
      result.data!,
      currentSession.playerId
    );
    const filter = args[0]?.toLowerCase();

    // Update the signull index map for shorthand references
    updateSignullIndexMap(status.signulls);

    printSignullList(status, filter);
  },

  start: async () => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    // Check if current player is host
    const stateResult = await getGameState(currentSession.roomId);
    if (!stateResult.success) {
      output.error(stateResult.error?.message || "Failed to get game state");
      return;
    }

    const state = stateResult.data!;
    if (state.hostId !== currentSession.playerId) {
      output.error("Only the host can start the game");
      return;
    }

    if (state.phase !== "lobby") {
      output.error("Game can only be started from the lobby");
      return;
    }

    const result = await startGame(currentSession.roomId);
    if (!result.success) {
      output.error(result.error?.message || "Failed to start game");
      return;
    }

    output.success("Game started! Setter should now set the secret word.");
  },

  setword: async (args) => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    if (currentSession.role !== "setter") {
      output.error("Only the setter can set the secret word");
      return;
    }

    if (args.length < 1) {
      output.error("Usage: setword <word>");
      return;
    }

    const word = args[0].toUpperCase();
    const result = await setSecretWord(
      currentSession.roomId,
      currentSession.playerId,
      word
    );

    if (!result.success) {
      output.error(result.error?.message || "Failed to set word");
      return;
    }

    output.success(`Secret word set! (${word.length} letters)`);
  },

  signull: async (args) => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    if (currentSession.role !== "guesser") {
      output.error("Only guessers can create signulls");
      return;
    }

    if (args.length < 2) {
      output.error(
        'Usage: signull <word> <clue>  (e.g., signull CAT "furry pet")'
      );
      return;
    }

    const word = args[0].toUpperCase();
    const clue = args
      .slice(1)
      .join(" ")
      .replace(/^["']|["']$/g, "");

    const result = await addSignull(
      currentSession.roomId,
      currentSession.playerId,
      word,
      clue
    );

    if (!result.success) {
      output.error(result.error?.message || "Failed to create signull");
      return;
    }

    output.success(`Signull created: ${word} - "${clue}" (ID: ${result.data})`);
  },

  connect: async (args) => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    if (currentSession.role !== "guesser") {
      output.error(
        "Only guessers can submit connects. Use 'intercept' if you are the setter."
      );
      return;
    }

    if (args.length < 2) {
      output.error(
        "Usage: connect <#|signullId> <guess>  (e.g., connect 1 CAT)"
      );
      return;
    }

    const signullRef = args[0];
    const signullId = resolveSignullId(signullRef);
    const guess = args[1].toUpperCase();

    const result = await submitConnect(
      currentSession.roomId,
      currentSession.playerId,
      signullId!,
      guess
    );

    if (!result.success) {
      output.error(result.error?.message || "Failed to submit connect");
      return;
    }

    if (result.data!.isCorrect) {
      output.success(`Correct! "${guess}" was the word.`);
    } else {
      output.info(`Incorrect. "${guess}" is not the word.`);
    }
  },

  guess: async (args) => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    if (currentSession.role !== "guesser") {
      output.error("Only guessers can make direct guesses");
      return;
    }

    if (args.length < 1) {
      output.error("Usage: guess <word>");
      return;
    }

    const word = args[0].toUpperCase();
    const result = await submitDirectGuess(
      currentSession.roomId,
      currentSession.playerId,
      word
    );

    if (!result.success) {
      output.error(result.error?.message || "Failed to submit guess");
      return;
    }

    if (result.data!.isCorrect) {
      output.success(`🎉 CORRECT! "${word}" is the secret word! Guessers win!`);
    } else {
      output.info(
        `Wrong guess. "${word}" is not the secret word. ${result.data!.guessesLeft} guesses left.`
      );
    }
  },

  intercept: async (args) => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    if (currentSession.role !== "setter") {
      output.error("Only the setter can intercept signulls");
      return;
    }

    if (args.length < 2) {
      output.error(
        "Usage: intercept <#|signullId> <guess>  (e.g., intercept 1 CAT)"
      );
      return;
    }

    const signullRef = args[0];
    const signullId = resolveSignullId(signullRef);
    const guess = args[1].toUpperCase();

    const result = await interceptSignull(
      currentSession.roomId,
      currentSession.playerId,
      signullId!,
      guess
    );

    if (!result.success) {
      output.error(result.error?.message || "Failed to intercept");
      return;
    }

    if (result.data!.isCorrect) {
      output.success(`Intercepted! Signull "${signullId}" has been blocked.`);
    } else {
      output.info(`Wrong guess. The signull continues.`);
    }
  },

  changesetter: async (args) => {
    if (!currentSession) {
      output.error("Not in a room");
      return;
    }

    if (args.length < 1) {
      output.error("Usage: changesetter <playerName>");
      return;
    }

    const targetName = args.join(" ");

    // Get current game state to find player by name
    const stateResult = await getGameState(currentSession.roomId);
    if (!stateResult.success) {
      output.error(stateResult.error?.message || "Failed to get game state");
      return;
    }

    const state = stateResult.data!;

    // Check phase
    if (state.phase !== "lobby" && state.phase !== "setting") {
      output.error("Can only change setter during lobby or setting phase");
      return;
    }

    // Check if current player is host
    if (state.hostId !== currentSession.playerId) {
      output.error("Only the host can change the setter");
      return;
    }

    // Find player by name (case-insensitive)
    const targetPlayer = Object.values(state.players).find(
      (p) => p.name.toLowerCase() === targetName.toLowerCase()
    );

    if (!targetPlayer) {
      output.error(`Player "${targetName}" not found in room`);
      output.info(
        "Available players: " +
          Object.values(state.players)
            .map((p) => p.name)
            .join(", ")
      );
      return;
    }

    if (targetPlayer.id === state.setterId) {
      output.info(`${targetPlayer.name} is already the setter`);
      return;
    }

    const result = await changeSetter(
      currentSession.roomId,
      targetPlayer.id,
      currentSession.playerId
    );

    if (!result.success) {
      output.error(result.error?.message || "Failed to change setter");
      return;
    }

    // Update session if we are no longer the setter
    if (
      currentSession.playerId !== targetPlayer.id &&
      currentSession.role === "setter"
    ) {
      currentSession.role = "guesser";
      saveSession(currentSession);
    } else if (currentSession.playerId === targetPlayer.id) {
      currentSession.role = "setter";
      saveSession(currentSession);
    }

    output.success(`${targetPlayer.name} is now the setter`);
  },

  quit: async () => {
    if (currentSession) {
      await commands.leave([]);
    }
    output.info("Goodbye!");
    process.exit(0);
  },

  exit: async () => {
    await commands.quit([]);
  },
};

// ==================== Display Helpers ====================

function printGameStatus(status: GameStatusOutput): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                        GAME STATUS                            ║
╠═══════════════════════════════════════════════════════════════╣
  Room:           ${status.roomId}
  Phase:          ${status.phase}
  Winner:         ${status.winner || "—"}
  
  Secret Word:    ${status.revealedLetters} (${status.letterCount} letters)
  Direct Guesses: ${status.directGuessesLeft} remaining
  ${status.lastDirectGuess ? `Last Guess:     "${status.lastDirectGuess.word}" by ${status.lastDirectGuess.playerName}` : ""}
  
  Settings:
    Play Mode:    ${status.settings.playMode}
    Connects Req: ${status.settings.connectsRequired}
    Prefix Mode:  ${status.settings.prefixMode ? "ON" : "OFF"}
╠═══════════════════════════════════════════════════════════════╣
  PLAYERS (${status.players.length})
╠═══════════════════════════════════════════════════════════════╣`);

  for (const player of status.players) {
    const isMe = status.currentPlayer?.id === player.id ? " ← YOU" : "";
    const online = player.isOnline ? "🟢" : "⚪";
    console.log(
      `  ${online} ${player.name.padEnd(15)} ${player.role.padEnd(8)} Score: ${player.score}${isMe}`
    );
  }

  if (status.signulls.length > 0) {
    console.log(`
╠═══════════════════════════════════════════════════════════════╣
  SIGNULLS (${status.signulls.length}) ${status.activeSignullId ? `[Active: ${status.activeSignullId}]` : ""}
╠═══════════════════════════════════════════════════════════════╣`);

    for (const signull of status.signulls) {
      const statusIcon = {
        pending: "⏳",
        resolved: "✅",
        failed: "❌",
        blocked: "🚫",
        inactive: "⚪",
      }[signull.status];

      const isActive = signull.id === status.activeSignullId ? " ← ACTIVE" : "";
      console.log(
        `  ${statusIcon} [${signull.id.slice(0, 12)}...] by ${signull.creatorName}${isActive}`
      );
      console.log(`     Clue: "${signull.clue}"`);
      console.log(
        `     Connects: ${signull.correctConnectCount}/${signull.connectCount} correct`
      );
      if (signull.word) {
        console.log(`     Word: ${signull.word}`);
      }
    }
  }

  console.log(`
╚═══════════════════════════════════════════════════════════════╝`);
}

function printSignullList(status: GameStatusOutput, filter?: string): void {
  if (status.signulls.length === 0) {
    output.info("No signulls yet.");
    return;
  }

  // Apply filter
  let filteredSignulls = status.signulls;
  let filterLabel = "ALL";

  if (filter) {
    switch (filter) {
      case "active":
        filteredSignulls = status.signulls.filter(
          (s) => s.id === status.activeSignullId
        );
        filterLabel = "ACTIVE";
        break;
      case "pending":
        filteredSignulls = status.signulls.filter(
          (s) => s.status === "pending"
        );
        filterLabel = "PENDING";
        break;
      case "resolved":
        filteredSignulls = status.signulls.filter(
          (s) => s.status === "resolved"
        );
        filterLabel = "RESOLVED";
        break;
      case "blocked":
        filteredSignulls = status.signulls.filter(
          (s) => s.status === "blocked"
        );
        filterLabel = "BLOCKED";
        break;
      case "failed":
        filteredSignulls = status.signulls.filter((s) => s.status === "failed");
        filterLabel = "FAILED";
        break;
      default:
        output.info(
          `Unknown filter: ${filter}. Available: active, pending, resolved, blocked, failed`
        );
        return;
    }
  }

  if (filteredSignulls.length === 0) {
    output.info(`No ${filterLabel.toLowerCase()} signulls.`);
    return;
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  SIGNULLS (${filterLabel}) - ${filteredSignulls.length} of ${status.signulls.length}
║  TIP: Use # shorthand with connect/intercept (e.g., connect 1 CAT)
╠═══════════════════════════════════════════════════════════════╣`);

  for (const signull of filteredSignulls) {
    // Find the index in the full list for shorthand reference
    const fullIndex = status.signulls.findIndex((s) => s.id === signull.id) + 1;

    const statusIcon = {
      pending: "⏳ PENDING",
      resolved: "✅ RESOLVED",
      failed: "❌ FAILED",
      blocked: "🚫 BLOCKED",
      inactive: "⚪ INACTIVE",
    }[signull.status];

    const isActive = signull.id === status.activeSignullId ? " ★ ACTIVE" : "";

    console.log(`
  #${fullIndex}${isActive}
  ├─ ID:       ${signull.id}
  ├─ Status:   ${statusIcon}
  ├─ Creator:  ${signull.creatorName}
  ├─ Clue:     "${signull.clue}"
  ├─ Connects: ${signull.correctConnectCount}/${signull.connectCount} correct${signull.word ? `\n  └─ Word:     ${signull.word}` : ""}`);
  }

  console.log(`
╚═══════════════════════════════════════════════════════════════╝
`);
}

// ==================== REPL Loop ====================

async function parseAndExecute(input: string): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;

  // Parse command and arguments
  // Handle quoted strings properly
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (const char of trimmed) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
    } else if (char === " " && !inQuotes) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);

  const [command, ...args] = parts;
  const cmd = command.toLowerCase();

  if (commands[cmd]) {
    try {
      await commands[cmd](args);
    } catch (error) {
      output.error(error instanceof Error ? error.message : "Command failed");
    }
  } else {
    output.error(
      `Unknown command: ${command}. Type 'help' for available commands.`
    );
  }
}

async function startREPL(): Promise<void> {
  const readline = await import("node:readline");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    SIGNULL CLI v0.1.0                         ║
║         Interactive REPL for AI Agents & Players              ║
╠═══════════════════════════════════════════════════════════════╣
║  Type 'help' for available commands                           ║
║  Type 'resume' to resume a saved session                      ║
║  Type 'quit' to exit                                          ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Initialize authentication
  output.info("Initializing authentication...");
  const authResult = await initializeAuth();

  if (!authResult.success) {
    output.error("Authentication failed. Please check your Firebase config.");
    output.error(authResult.error?.message || "Unknown error");
    process.exit(1);
  }

  currentPlayerId = authResult.data!;
  output.success(`Authenticated as ${currentPlayerId.slice(0, 8)}...`);

  // Try to load existing session
  const { session } = loadSession();
  if (session) {
    output.info(
      `Found saved session for room ${session.roomId}. Type 'resume' to continue.`
    );
  }

  output.prompt();

  rl.on("line", async (line) => {
    await parseAndExecute(line);
    output.prompt();
  });

  rl.on("close", async () => {
    await commands.quit([]);
  });
}

// ==================== Entry Point ====================

startREPL().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
