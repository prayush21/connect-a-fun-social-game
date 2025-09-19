// Firebase module exports
export * from "./config";
export * from "./game";

// Re-export admin functions only on server-side
export type { FirestoreGameRoom } from "../types";

// Client-side only exports
export {
  createRoom,
  joinRoom,
  leaveRoom,
  returnToLobby,
  setSecretWord,
  setReference,
  submitGuess,
  submitDirectGuess,
  submitSetterGuess,
  updateGameSettings,
  removePlayer,
  changeSetter,
  volunteerAsClueGiver,
  startGameRound,
  subscribeToGameRoom,
  generateRoomCode,
  checkRoomExists,
  checkReferenceResolution,
  submitFeedback,
  submitSatisfactionSurvey,
  firestoreToGameState,
  gameStateToFirestore,
} from "./game";

export { db, getFirebaseAnalytics, firebaseApp } from "./config";
