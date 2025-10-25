import { z } from "zod";

// Core game validation schemas
export const setWordSchema = z.object({
  word: z
    .string()
    .trim()
    .min(3, "Word must be at least 3 letters")
    .max(24, "Word too long")
    .regex(/^[a-zA-Z]+$/, "Letters only"),
});

export const referenceSchema = z.object({
  referenceWord: z
    .string()
    .trim()
    .min(2, "Reference word must be at least 2 letters")
    .max(24, "Reference word too long")
    .regex(/^[a-zA-Z]+$/, "Letters only"),
  clue: z
    .string()
    .trim()
    .min(2, "Clue must be at least 2 characters")
    .max(120, "Clue too long"),
});

export const directGuessSchema = z.object({
  word: z
    .string()
    .trim()
    .min(3, "Guess must be at least 3 letters")
    .max(24, "Guess too long")
    .regex(/^[a-zA-Z]+$/, "Letters only"),
});

export const guessSchema = z.object({
  guess: z
    .string()
    .trim()
    .min(1, "Guess cannot be empty")
    .max(24, "Guess too long")
    .regex(/^[a-zA-Z]+$/, "Letters only"),
});

// User validation schemas
export const nicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "Nickname must be at least 2 characters")
    .max(20, "Nickname must be less than 20 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Only letters, numbers, underscore and dash allowed"
    ),
});

export const joinGameSchema = z.object({
  gameCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(6, "Game code must be exactly 6 characters")
    .regex(/^[A-Z0-9]+$/, "Invalid game code format"),
});

// Room management schemas
export const createRoomSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(20, "Username too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid username format"),
});

export const joinRoomSchema = z.object({
  roomId: z
    .string()
    .trim()
    .toUpperCase()
    .length(6, "Room code must be exactly 6 characters")
    .regex(/^[A-Z0-9]+$/, "Invalid room code format"),
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(20, "Username too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid username format"),
});

// Game settings validation
export const gameSettingsSchema = z.object({
  majorityThreshold: z
    .number()
    .min(1, "Threshold must be at least 1")
    .int("Threshold must be a whole number"),
  timeLimit: z
    .number()
    .min(10, "Time limit must be at least 10 seconds")
    .max(300, "Time limit cannot exceed 5 minutes")
    .int("Time limit must be a whole number"),
  maxPlayers: z
    .number()
    .min(3, "Must allow at least 3 players")
    .max(12, "Cannot exceed 12 players")
    .int("Max players must be a whole number"),
  wordValidation: z.enum(["strict", "relaxed"]),
});

// Player validation
export const playerSchema = z.object({
  id: z.string().min(1, "Player ID required"),
  name: z
    .string()
    .trim()
    .min(2, "Player name must be at least 2 characters")
    .max(20, "Player name too long"),
  role: z.enum(["setter", "guesser"] as const),
  isOnline: z.boolean().default(true),
  lastActive: z.date(),
});

// Reference validation
export const referenceSubmissionSchema = z.object({
  clueGiverId: z.string().min(1, "Clue giver ID required"),
  referenceWord: z
    .string()
    .trim()
    .min(2, "Reference word must be at least 2 letters")
    .max(24, "Reference word too long")
    .regex(/^[a-zA-Z]+$/, "Letters only"),
  clue: z
    .string()
    .trim()
    .min(2, "Clue must be at least 2 characters")
    .max(120, "Clue too long"),
  isClimactic: z.boolean().default(false),
});

// Game state validation
export const gamePhaseSchema = z.enum([
  "lobby",
  "setting_word",
  "guessing",
  "ended",
] as const);
export const playerRoleSchema = z.enum(["setter", "guesser"] as const);
export const gameWinnerSchema = z.union([
  z.null(),
  z.enum(["guessers", "setter"]),
]);

// Prefix validation helper
export const createPrefixValidationSchema = (
  revealedPrefix: string,
  expectedLength?: number
) => {
  const baseSchema = z
    .string()
    .trim()
    .regex(/^[a-zA-Z]+$/, "Letters only")
    .refine(
      (word: string) =>
        word.toUpperCase().startsWith(revealedPrefix.toUpperCase()),
      `Word must start with "${revealedPrefix}"`
    );

  if (expectedLength) {
    return baseSchema.refine(
      (word: string) => word.length === expectedLength,
      `Word must be exactly ${expectedLength} letters long`
    );
  }

  return baseSchema.refine(
    (word: string) => word.length >= revealedPrefix.length,
    `Word must be at least ${revealedPrefix.length} letters`
  );
};

// Analytics validation
export const analyticsEventSchema = z.object({
  name: z.string().min(1, "Event name required"),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.date().optional(),
});

// Error validation
export const gameErrorSchema = z.object({
  code: z.string().min(1, "Error code required"),
  message: z.string().min(1, "Error message required"),
  details: z.record(z.unknown()).optional(),
});

// Utility validation functions
export const validateRoomCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code);
};

export const validateUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_-]{2,20}$/.test(username);
};

export const validateWord = (word: string): boolean => {
  return /^[a-zA-Z]{3,24}$/.test(word);
};

export const validatePrefix = (word: string, prefix: string): boolean => {
  return word.toUpperCase().startsWith(prefix.toUpperCase());
};
