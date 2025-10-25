// Firebase Admin SDK for server-side operations
import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, DocumentData } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  // Check if admin app is already initialized
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Validate required environment variables
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      "Missing required Firebase Admin environment variables: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, or NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    );
  }

  // Parse the private key (handle escaped newlines)
  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  };

  return initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
};

// Initialize admin app and firestore
let adminApp: ReturnType<typeof initializeFirebaseAdmin>;
let adminDb: ReturnType<typeof getFirestore>;

try {
  adminApp = initializeFirebaseAdmin();
  adminDb = getFirestore(adminApp);
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  // In development, we might not have admin credentials
  if (process.env.NODE_ENV === "development") {
    console.warn("Running without Firebase Admin SDK in development mode");
  } else {
    throw error;
  }
}

export { adminApp, adminDb };

// Helper functions for server-side operations
export const createGameRoom = async (
  roomId: string,
  initialData: DocumentData
) => {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const docRef = adminDb.collection("game_rooms").doc(roomId);
  await docRef.set({
    ...initialData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return docRef;
};

export const updateGameRoom = async (roomId: string, updates: DocumentData) => {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const docRef = adminDb.collection("game_rooms").doc(roomId);
  await docRef.update({
    ...updates,
    updatedAt: new Date(),
  });

  return docRef;
};

export const getGameRoom = async (roomId: string) => {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const docRef = adminDb.collection("game_rooms").doc(roomId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() };
};

export const deleteGameRoom = async (roomId: string) => {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const docRef = adminDb.collection("game_rooms").doc(roomId);
  await docRef.delete();
};

// Room code generation
export const generateRoomCode = (): string => {
  // Use consonants and vowels for easier pronunciation/memorization
  // Exclude confusing characters: I/L (looks like 1), O (looks like 0)
  const consonants = "BCDFGHJKMNPQRSTVWXYZ"; // Removed L
  const vowels = "AEUY"; // Removed I and O
  const numbers = "23456789"; // Removed 0 and 1
  
  let result = "";
  
  // Generate pattern: C-V-C-V-N-N (Consonant-Vowel-Consonant-Vowel-Number-Number)
  // This creates pronounceable-ish codes like "TAKE42" or "PUFE73"
  result += consonants.charAt(Math.floor(Math.random() * consonants.length));
  result += vowels.charAt(Math.floor(Math.random() * vowels.length));
  result += consonants.charAt(Math.floor(Math.random() * consonants.length));
  result += vowels.charAt(Math.floor(Math.random() * vowels.length));
  result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  return result;
};

// Validate room code exists
export const validateRoomExists = async (roomId: string): Promise<boolean> => {
  if (!adminDb) {
    return false;
  }

  try {
    const doc = await adminDb.collection("game_rooms").doc(roomId).get();
    return doc.exists;
  } catch (error) {
    console.error("Error validating room:", error);
    return false;
  }
};
