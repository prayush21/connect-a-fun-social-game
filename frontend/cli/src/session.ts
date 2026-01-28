/**
 * Session Persistence Module
 *
 * Handles saving and loading CLI session data to allow AI agents
 * to resume games after terminal restart.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { CLISession, PlayerId, RoomId, PlayerRole } from "./types.js";

// Default session file location
const DEFAULT_SESSION_DIR = join(homedir(), ".signull");
const DEFAULT_SESSION_FILE = join(DEFAULT_SESSION_DIR, "session.json");

/**
 * Get the session file path from config or use default
 */
export const getSessionFilePath = (customPath?: string): string => {
  return customPath || DEFAULT_SESSION_FILE;
};

/**
 * Ensure the session directory exists
 */
const ensureSessionDir = (filePath: string): void => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

/**
 * Save session data to disk
 */
export const saveSession = (
  session: CLISession,
  filePath?: string
): { success: boolean; error?: string } => {
  try {
    const path = getSessionFilePath(filePath);
    ensureSessionDir(path);

    const data: CLISession = {
      ...session,
      lastActiveAt: new Date().toISOString(),
    };

    writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save session",
    };
  }
};

/**
 * Load session data from disk
 */
export const loadSession = (
  filePath?: string
): { session: CLISession | null; error?: string } => {
  try {
    const path = getSessionFilePath(filePath);

    if (!existsSync(path)) {
      return { session: null };
    }

    const content = readFileSync(path, "utf-8");
    const data = JSON.parse(content) as CLISession;

    // Validate required fields
    if (!data.roomId || !data.playerId || !data.username) {
      return { session: null, error: "Invalid session data" };
    }

    return { session: data };
  } catch (error) {
    return {
      session: null,
      error: error instanceof Error ? error.message : "Failed to load session",
    };
  }
};

/**
 * Clear session data from disk
 */
export const clearSession = (
  filePath?: string
): { success: boolean; error?: string } => {
  try {
    const path = getSessionFilePath(filePath);

    if (existsSync(path)) {
      writeFileSync(path, "{}", "utf-8");
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear session",
    };
  }
};

/**
 * Create a new session object
 */
export const createSession = (
  roomId: RoomId,
  playerId: PlayerId,
  username: string,
  role: PlayerRole
): CLISession => {
  const now = new Date().toISOString();
  return {
    roomId,
    playerId,
    username,
    role,
    createdAt: now,
    lastActiveAt: now,
  };
};

/**
 * Update session with new data (preserves createdAt)
 */
export const updateSession = (
  existing: CLISession,
  updates: Partial<Pick<CLISession, "roomId" | "role" | "username">>
): CLISession => {
  return {
    ...existing,
    ...updates,
    lastActiveAt: new Date().toISOString(),
  };
};

/**
 * Check if session is still valid (room exists, player still in room)
 * This is a placeholder - actual validation happens in firebase-adapter
 */
export const isSessionValid = (session: CLISession): boolean => {
  // Basic validation - actual room check happens at Firebase level
  return !!(session.roomId && session.playerId && session.username);
};
