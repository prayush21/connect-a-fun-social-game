// Firebase client configuration
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getAnalytics,
  Analytics,
  isSupported,
  logEvent,
  EventParams,
} from "firebase/analytics";
import { getAuth, Auth, signInAnonymously } from "firebase/auth";

// Default configuration for development
// const defaultConfig = {
//   apiKey: "AIzaSyDLRuts4gBq72Q7ZbdQVmu_U2HOmz1TNBk",
//   authDomain: "connect-38fe1.firebaseapp.com",
//   projectId: "connect-38fe1",
//   storageBucket: "connect-38fe1.appspot.com",
//   messagingSenderId: "680572399322",
//   appId: "1:680572399322:web:e4c00f4417410f367fffe3",
//   measurementId: "G-ZMNV6D3YZC",
// };

// Lazy initialization to avoid SSR issues
let firebaseAppInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let analyticsInstance: Analytics | null = null;

const getFirebaseConfig = () => {
  // console.log("--- DEBUG: Checking Environment Variables ---");
  // console.log("NODE_ENV:", process.env.NODE_ENV);
  // console.log(
  //   "NEXT_PUBLIC_FIREBASE_API_KEY:",
  //   process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  // );
  // console.log(
  //   "NEXT_PUBLIC_FIREBASE_PROJECT_ID:",
  //   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  // );
  // console.log(
  //   "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:",
  //   process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  // );
  // console.log("--- End of DEBUG ---");

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // const config = {
  //   apiKey: "AIzaSyDLRuts4gBq72Q7ZbdQVmu_U2HOmz1TNBk",
  //   authDomain: "connect-38fe1.firebaseapp.com",
  //   projectId: "connect-38fe1",
  //   storageBucket: "connect-38fe1.appspot.com",
  //   messagingSenderId: "680572399322",
  //   appId: "1:680572399322:web:e4c00f4417410f367fffe3",
  //   measurementId: "G-ZMNV6D3YZC",
  // };

  // Check if any required variables are missing
  const requiredEnvVars = [
    config.apiKey,
    config.authDomain,
    config.projectId,
    config.appId,
  ];

  const missingEnvVars = requiredEnvVars.filter((v) => !v);

  if (missingEnvVars.length > 0) {
    // In development, we should fail fast if a .env.local file is not configured.
    // This prevents accidentally using a demo project.
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "Missing Firebase env vars: " + missingEnvVars.join(", ")
      );
    }
    throw new Error(
      `Missing required Firebase environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  return config;
};

const initializeFirebaseApp = (): FirebaseApp => {
  if (firebaseAppInstance) return firebaseAppInstance;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAppInstance = existingApps[0];
    return firebaseAppInstance;
  }

  const config = getFirebaseConfig();
  firebaseAppInstance = initializeApp(config);
  return firebaseAppInstance;
};

// Export getter functions instead of direct instances
export const getFirebaseApp = (): FirebaseApp => {
  return initializeFirebaseApp();
};

export const getDb = (): Firestore => {
  if (dbInstance) return dbInstance;

  const firebaseApp = getFirebaseApp();
  dbInstance = getFirestore(firebaseApp);

  // Connect to Firestore emulator in development (client-side only)
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_USE_EMULATOR === "true" &&
    typeof window !== "undefined"
  ) {
    try {
      console.log("Connecting to Firestore emulator...");
      connectFirestoreEmulator(dbInstance, "localhost", 8080);
    } catch (error) {
      // Emulator already connected or not available
      console.warn("Firestore emulator connection failed:", error);
    }
  }

  return dbInstance;
};

// Authentication
export const getFirebaseAuth = (): Auth => {
  if (authInstance) return authInstance;

  const firebaseApp = getFirebaseApp();
  authInstance = getAuth(firebaseApp);
  return authInstance;
};

// Initialize Analytics (client-side only)
export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window === "undefined") return null;

  if (analyticsInstance) return analyticsInstance;

  const supported = await isSupported();
  if (!supported) return null;

  const firebaseApp = getFirebaseApp();
  analyticsInstance = getAnalytics(firebaseApp);
  return analyticsInstance;
};

// Environment detection
export const getEnvironment = (): "dev" | "prod" => {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("localhost")
  ) {
    return "dev";
  }
  return "prod";
};

// Analytics logging with environment prefix
export const logAnalyticsEvent = async (
  eventName: string,
  parameters: EventParams = {}
) => {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      const environment = getEnvironment();
      const prefixedEventName = `${environment}_${eventName}`;

      const enrichedParameters = {
        ...parameters,
        environment,
      };

      logEvent(analytics, prefixedEventName, enrichedParameters);
      console.log(
        `Analytics event logged: ${prefixedEventName}`,
        enrichedParameters
      );
    }
  } catch (error) {
    console.error(`Failed to log analytics event ${eventName}:`, error);
  }
};

// Authentication helpers
export const initializeAuth = async (): Promise<string | null> => {
  try {
    const auth = getFirebaseAuth();
    const userCredential = await signInAnonymously(auth);
    await logAnalyticsEvent("app_session", { timestamp: Date.now() });
    return userCredential.user.uid;
  } catch (error) {
    console.error("Authentication failed:", error);
    return null;
  }
};

// For backward compatibility
export { getDb as db };
export const firebaseApp = getFirebaseApp;
export default getFirebaseApp;
