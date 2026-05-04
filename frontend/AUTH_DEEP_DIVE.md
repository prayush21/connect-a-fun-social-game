# Authentication Deep Dive: Store → Firebase App → Configuration

## Overview: The Three Layers

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: React Component Layer                      │
│  AuthProvider (src/components/auth-provider.tsx)    │
└─────────────────────────────────────────────────────┘
                        ↓
                   Calls initAuth()
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: State Management (Zustand Store)          │
│  useBetaStore or useStore                           │
│  (src/lib/beta/store.ts, src/lib/store.ts)         │
└─────────────────────────────────────────────────────┘
                        ↓
                   Calls initializeAuth()
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: Firebase Config Helpers                   │
│  (src/lib/firebase/config.ts)                       │
│  - getFirebaseApp()                                 │
│  - getFirebaseAuth()                                │
│  - initializeAuth()                                 │
└─────────────────────────────────────────────────────┘
                        ↓
                   Uses Firebase SDK
                        ↓
┌─────────────────────────────────────────────────────┐
│  Firebase SDK (firebase v12.1.0)                    │
│  - initializeApp()                                  │
│  - getAuth()                                        │
│  - signInAnonymously()                              │
└─────────────────────────────────────────────────────┘
```

---

## Step 1: Configuration Layer - The Foundation

### 1.1 Module-Level Singleton Pattern

In `config.ts`, Firebase instances are created **once** per app lifecycle and cached:

```typescript
// src/lib/firebase/config.ts

// SINGLETON CACHE: Stored at module level (persist across function calls)
let firebaseAppInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
```

**Why singletons?**

- Firebase can only be initialized once per tab
- Prevents accidental multiple initializations
- Ensures all parts of app use the same Firebase instance
- Critical for Next.js where modules load once but components mount/unmount

### 1.2 Reading Environment Variables

```typescript
const getFirebaseConfig = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Validation
  const requiredEnvVars = [
    config.apiKey,
    config.authDomain,
    config.projectId,
    config.appId,
  ];

  const missingEnvVars = requiredEnvVars.filter((v) => !v);

  if (missingEnvVars.length > 0) {
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
```

**Key Points:**

1. **Public prefix:** `NEXT_PUBLIC_*` means these are safe to expose in browser (API key is public, Security Rules protect data)
2. **Validation:** Fails fast in development if env vars missing
3. **In production:** Still throws but with different message
4. **Source:** `.env.local` file (not committed to git for security)

**Example `.env.local`:**

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDLRuts4gBq72Q7ZbdQVmu_U2HOmz1TNBk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=connect-38fe1.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=connect-38fe1
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=connect-38fe1.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=680572399322
NEXT_PUBLIC_FIREBASE_APP_ID=1:680572399322:web:e4c00f4417410f367fffe3
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ZMNV6D3YZC
```

### 1.3 Lazy Initialization: getFirebaseApp()

```typescript
const initializeFirebaseApp = (): FirebaseApp => {
  // Check 1: Already initialized in this module?
  if (firebaseAppInstance) return firebaseAppInstance;

  // Check 2: Firebase SDK already has an app from another part of code?
  const existingApps = getApps(); // Returns all initialized Firebase apps
  if (existingApps.length > 0) {
    firebaseAppInstance = existingApps[0];
    return firebaseAppInstance;
  }

  // Check 3: First time - initialize
  const config = getFirebaseConfig();
  firebaseAppInstance = initializeApp(config); // Firebase SDK call
  return firebaseAppInstance;
};

export const getFirebaseApp = (): FirebaseApp => {
  return initializeFirebaseApp();
};
```

**Flow on First Call:**

```
Call: getFirebaseApp()
  ↓
Check: firebaseAppInstance is null? Yes
  ↓
Check: existingApps.length > 0? No
  ↓
Read: getFirebaseConfig() → loads env vars & validates
  ↓
Initialize: initializeApp(config) ← Firebase SDK
  ↓
Cache: firebaseAppInstance = result
  ↓
Return: result
```

**Flow on Subsequent Calls:**

```
Call: getFirebaseApp()
  ↓
Check: firebaseAppInstance is null? No
  ↓
Return: cached instance immediately (instant)
```

**Why this pattern?**

1. **Lazy:** Don't initialize Firebase until first needed (might never be needed in SSR)
2. **Idempotent:** Safe to call 100 times, only initializes once
3. **Next.js friendly:** SSR doesn't initialize, only client-side does

---

## Step 2: Authentication Getter - getFirebaseAuth()

```typescript
export const getFirebaseAuth = (): Auth => {
  // Check: Already created Auth instance?
  if (authInstance) return authInstance;

  // First time: Get Firebase app (or get cached one)
  const firebaseApp = getFirebaseApp();

  // Create Auth service bound to this Firebase app
  authInstance = getAuth(firebaseApp);

  // Cache and return
  return authInstance;
};
```

**Dependency Chain:**

```
getFirebaseAuth()
  ↓
  └→ getFirebaseApp()
      ↓
      └→ initializeFirebaseApp()
          ↓
          └→ Firebase SDK initialized
```

**Key Concept: Service Binding**

- `getAuth(firebaseApp)` ties Auth service to specific Firebase app
- Same Firebase app instance → same Auth instance
- Ensures all authentication happens in same auth context

---

## Step 3: Core Auth Function - initializeAuth()

```typescript
export const initializeAuth = async (): Promise<string | null> => {
  try {
    // Step 1: Get Auth service
    const auth = getFirebaseAuth();

    // Step 2: Sign in anonymously
    const userCredential = await signInAnonymously(auth);

    // Step 3: Extract and return user ID
    return userCredential.user.uid;
  } catch (error) {
    console.error("Authentication failed:", error);
    return null; // Graceful fallback
  }
};
```

**What happens inside `signInAnonymously(auth)`?**

Firebase SDK makes a network call to Google's Firebase service:

1. **Creates new anonymous user** (no email/password needed)
2. **Returns `UserCredential`** with:
   ```typescript
   {
     user: {
       uid: "Qx8jK9mL2n3pQ4rS5tU6vW7x",  // Unique ID generated by Firebase
       isAnonymous: true,
       metadata: {
         creationTime: "2026-05-03T10:15:30.000Z",
         lastSignInTime: "2026-05-03T10:15:30.000Z"
       }
       // ... other properties
     }
   }
   ```
3. **UID is stored** in Firebase Auth backend
4. **Client receives uid** to store locally

**Error Handling:**

```typescript
return null; // Instead of throwing
```

This graceful failure allows the app to continue:

- Store catches the `null` and generates fallback UUID
- Users can still play (but might lose session on refresh)

---

## Step 4: State Management Integration - The Store

### 4.1 Beta Store Implementation

```typescript
// src/lib/beta/store.ts

export const useBetaStore = create<BetaStoreState>()(
  persist(
    (set, get) => ({
      // ...other state...

      userId: null, // Will be set by initAuth
      username: generateRandomNickname(),

      initAuth: async () => {
        try {
          // Call config helper
          const userId = await initializeAuth();

          if (userId) {
            // Success: Store Firebase UID
            set({ userId });
          } else {
            // Fallback: Generate random UUID
            set({ userId: crypto.randomUUID() });
          }
        } catch (error) {
          console.error("Failed to initialize auth:", error);
          // Double fallback
          set({ userId: crypto.randomUUID() });
        }
      },

      // ...rest of store...
    }),

    // Persistence middleware: saves to localStorage
    {
      name: "beta-store", // localStorage key
      // ... more config
    }
  )
);
```

**Store State Shape:**

```typescript
{
  userId: "Qx8jK9mL2n3pQ4rS5tU6vW7x",  // Firebase UID or UUID
  username: "CleverFox42",               // User's chosen name
  roomId: null,                          // Not yet in a room
  game: null,                            // No game state yet
  isLoading: false,
  error: null,
  initialized: false,
}
```

### 4.2 Persistence Layer: localStorage

**Zustand `persist` middleware:**

```typescript
{
  name: "beta-store",
  // Saves to: localStorage.getItem("beta-store")
  // On app load: restores this exact state
}
```

**What gets saved?**

```javascript
// localStorage["beta-store"]
{
  "userId": "Qx8jK9mL2n3pQ4rS5tU6vW7x",
  "username": "CleverFox42",
  "roomId": null,
  "game": null,
  "isLoading": false,
  "error": null,
  "initialized": false
}
```

**On App Reload:**

1. Browser loads HTML
2. JavaScript runs
3. Zustand's `persist` middleware initializes from localStorage
4. **userId is immediately available** (no async wait)
5. No need to call `initAuth()` again

**Fallback if localStorage empty:**

- No userId in store
- AuthProvider will detect this
- Will call `initAuth()` to create new one

---

## Step 5: Component Layer - AuthProvider

### 5.1 RootLayout Wraps Everything

```typescript
// src/app/layout.tsx

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={bricolageGrotesque.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**Rendering Order:**

```
Browser loads index.html
  ↓
Next.js initializes app
  ↓
RootLayout renders (server-side)
  ↓
AuthProvider renders (client-side, marked with "use client")
  ↓
RootLayout children render (BetaLayout, etc.)
```

### 5.2 AuthProvider Effect Hook

```typescript
// src/components/auth-provider.tsx

"use client";  // Must be client component to use hooks

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function AuthProvider({ children }: AuthProviderProps) {
  // Extract auth-related functions from store
  const initAuth = useStore((state) => state.initAuth);
  const sessionId = useStore((state) => state.sessionId);

  // Run on component mount and when dependencies change
  useEffect(() => {
    // Check: Do we already have a sessionId?
    if (!sessionId) {
      // No → Initialize auth
      initAuth();
    }
  }, [initAuth, sessionId]);  // Dependencies

  return <>{children}</>;
}
```

**Execution Timeline:**

```
[1] Browser loads, React mounts AuthProvider
    ↓
[2] Zustand restores state from localStorage
    ↓
[3] sessionId selector reads from store
    ↓
[4] If sessionId exists:
      Don't call initAuth (skip useEffect body)
      ✓ User is already authenticated
    ↓
[5] If sessionId doesn't exist:
      Call initAuth async function
      ↓
      [5a] initializeAuth() in config
      ↓
      [5b] getFirebaseAuth() → getFirebaseApp()
      ↓
      [5c] Firebase SDK initializes with env vars
      ↓
      [5d] signInAnonymously() makes network call
      ↓
      [5e] Firebase returns uid: "Qx8jK9mL2n3pQ4rS5tU6vW7x"
      ↓
      [5f] Store receives uid and calls set({ userId })
      ↓
      [5g] Zustand notifies subscribers of state change
      ↓
      [5h] AuthProvider re-renders (sessionId now exists)
      ↓
      [5i] useEffect sees sessionId is now truthy
      ↓
      [5j] Effect doesn't run again (dependency satisfied)
```

---

## Step 6: Data Flow Diagram - Start to Finish

### 6.1 First Load (No localStorage)

```
┌─────────────────────────────────────────────────┐
│  User opens https://signull.com                 │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  Browser loads HTML + JavaScript                │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  Zustand persist middleware reads localStorage  │
│  Result: No data (fresh installation)          │
│  userId = null (default)                        │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  RootLayout mounts                              │
│  AuthProvider mounts                            │
│  useEffect runs: sessionId is null              │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  initAuth() called                              │
│  (store action)                                 │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  initializeAuth() in config.ts                  │
│  - getFirebaseAuth()                            │
│  - signInAnonymously()                          │
│  [NETWORK REQUEST → Firebase Backend]           │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  Firebase Backend                               │
│  - Creates anonymous user account               │
│  - Generates unique UID                         │
│  - Returns UID to client                        │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  Client receives:                               │
│  uid: "Qx8jK9mL2n3pQ4rS5tU6vW7x"                │
│                                                 │
│  initAuth() in store:                           │
│  set({ userId: "Qx8jK9mL2n3pQ4rS5tU6vW7x" })  │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  Zustand notifies all subscribers               │
│  (React components listening to userId)         │
│                                                 │
│  Persist middleware saves to localStorage:      │
│  {                                              │
│    "userId": "Qx8jK9mL2n3pQ4rS5tU6vW7x",      │
│    "username": "CleverFox42",                   │
│    ... (other state)                            │
│  }                                              │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  React re-renders with new state                │
│  AuthProvider sees sessionId exists             │
│  useEffect dependency satisfied                 │
│  Children components can now access userId      │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  BetaHomeContent renders                        │
│  User sees: "Create Game" / "Join Game" buttons │
│  Ready to interact!                             │
└─────────────────────────────────────────────────┘
```

### 6.2 Second Load (With localStorage)

```
┌─────────────────────────────────────────────────┐
│  User returns to app (page refresh)             │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  Browser loads HTML + JavaScript                │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  Zustand persist middleware reads localStorage  │
│  Result: Found stored state                     │
│  userId = "Qx8jK9mL2n3pQ4rS5tU6vW7x" ✓         │
│  username = "CleverFox42" ✓                     │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  RootLayout mounts                              │
│  AuthProvider mounts                            │
│  useEffect runs: sessionId exists (from store)  │
│  Condition: if (!sessionId) → FALSE             │
│  → useEffect body doesn't run ✓                 │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  No network request to Firebase                 │
│  No async delay                                 │
│  Instant app load from localStorage             │
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  BetaHomeContent renders immediately            │
│  User sees same UI within milliseconds          │
│  Already "logged in" with previous UID          │
└─────────────────────────────────────────────────┘
```

---

## Step 7: The Interplay - Key Interactions

### 7.1 Config ↔ Store Coupling

**Store doesn't directly reference config helpers:**

```typescript
// WRONG: Store shouldn't know about config details
// const { initializeApp, getApps } = require("firebase/app");

// RIGHT: Store only imports the high-level API
import { initializeAuth } from "@/lib/firebase/config";

initAuth: async () => {
  const userId = await initializeAuth(); // High-level call
  set({ userId });
};
```

**Benefit: Separation of Concerns**

- Store only knows: "Call initializeAuth, get userId"
- Store doesn't care about Firebase SDK details
- If Firebase migration needed, only config.ts changes

### 7.2 Firebase App Lifecycle

```
config.ts module loads
  ↓
firebaseAppInstance = null  (module-level variable)
  ↓
Component calls initAuth()
  ↓
Store calls initializeAuth()
  ↓
Config calls getFirebaseApp()
  ↓
Check: firebaseAppInstance is null?
  ↓
YES → initializeApp(config)  ← Firebase SDK called ONCE
      firebaseAppInstance = result
  ↓
NO → Return cached instance
```

**Why important:**

- Firebase registers itself globally
- Second initialization would throw error
- Singleton pattern prevents this

### 7.3 The userId Flow

```typescript
Firebase Backend
  ↓ (generates unique ID)
  ↓
signInAnonymously() returns UserCredential
  ↓
initializeAuth() extracts: userCredential.user.uid
  ↓
Store receives: userId string
  ↓
set({ userId })
  ↓
Persist middleware saves: localStorage["beta-store"]
  ↓
Selector: useStore((state) => state.userId)
  ↓
Component gets: "Qx8jK9mL2n3pQ4rS5tU6vW7x"
```

---

## Step 8: Scenarios & Edge Cases

### 8.1 What if Network Fails During Auth?

```typescript
export const initializeAuth = async (): Promise<string | null> => {
  try {
    // Network call fails here
    const userCredential = await signInAnonymously(auth);
    return userCredential.user.uid;
  } catch (error) {
    // Firebase throws error
    console.error("Authentication failed:", error);
    return null; // Return null
  }
};
```

**Store handles it:**

```typescript
const userId = await initializeAuth();

if (userId) {
  set({ userId });
} else {
  // Generate fallback UUID
  set({ userId: crypto.randomUUID() });
}
```

**Result:**

- User gets: `userId = "550e8400-e29b-41d4-a716-446655440000"` (random)
- App continues working
- When they try to create room, Firestore Security Rules reject (no real Firebase auth)
- Error message guides them to retry

### 8.2 What if AuthProvider Unmounts?

```typescript
useEffect(() => {
  if (!sessionId) {
    initAuth();
  }
}, [initAuth, sessionId]); // ← Dependencies

// On unmount: useEffect cleanup ignored (no cleanup function)
// On parent re-render: useEffect re-runs if dependencies change
```

**Scenario: User navigates away**

- AuthProvider unmounts
- useEffect cancels (React cleans up)
- Async `initAuth()` may still be running

**Result:**

- If it completes: setState called on unmounted component → React warns but ignores
- If it's pending: Component unmounts, Firebase response arrives but nowhere to send it

**Safety:**

- Zustand store persists data anyway
- On next load: localStorage has userId, no re-initialization needed

### 8.3 What if localStorage is Disabled?

```typescript
// Browser has localStorage disabled

Zustand persist middleware tries: localStorage.getItem("beta-store")
  ↓
Throws error: "localStorage not available"
  ↓
Zustand catches and falls back to memory-only
  ↓
userId = null (default)
  ↓
AuthProvider detects null
  ↓
Calls initAuth()
  ↓
App works, but:
  - Page refresh → userId lost
  - But Firebase UID still valid on backend
  - User appears as different player each time
```

### 8.4 Multiple Tabs Open

```
User opens Tab 1:
  ↓
localStorage["beta-store"] = { userId: "123" }
Firefox Auth: assigned UID "123"
  ↓
User opens Tab 2 (same site):
  ↓
localStorage["beta-store"] = { userId: "123" }  ← Same value
Firefox Auth: already has UID "123"  ← Reuses
  ↓
Both tabs have same userId ✓
Firestore queries show same player in both tabs
```

**Important:** Firebase Auth is per-origin, shared across tabs. Both tabs get same UID.

---

## Step 9: Security Considerations

### 9.1 Why Anonymous Auth is Safe

```typescript
// Anonymous user has NO credentials
// Can't sign out and sign in as different user without starting fresh

// API Key is PUBLIC (safe):
apiKey: "AIzaSyDLRuts4gBq72Q7ZbdQVmu_U2HOmz1TNBk"
// Anyone could use this API key
// But Firestore Security Rules control what they can do

// Firestore Rules Example:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /game_rooms/{roomId} {
      // Only allow writes from the creator
      allow write: if request.auth.uid == resource.data.hostId;
      // Everyone can read public rooms
      allow read: if true;
    }
  }
}
```

### 9.2 No Sensitive Data in localStorage

```typescript
// SAFE: Public info
{
  "userId": "Qx8jK9mL2n3pQ4rS5tU6vW7x",  // Just an ID
  "username": "CleverFox42",                // Display name
  "roomId": "TAKE42",                       // Room code
}

// NEVER store in localStorage:
// - Passwords
// - API keys (though these are public anyway)
// - Private game data
```

---

## Step 10: Debug Checklist

### When Auth Isn't Working:

```
☐ Check browser console for errors
  Look for: "Missing Firebase env vars"

☐ Verify .env.local exists in project root
  Contains: NEXT_PUBLIC_FIREBASE_* variables

☐ Check localStorage:
  DevTools → Application → Local Storage
  Look for: "beta-store" entry
  Should contain: userId field

☐ Check network tab:
  Look for: XHR requests to firebase...
  Should show: 200 response for signInAnonymously

☐ Check React DevTools:
  Look at: useBetaStore state
  Should show: userId is truthy string

☐ Check Firebase Console:
  Authentication section
  Should show: Anonymous Users listed

☐ Check if running on localhost:
  getEnvironment() checks hostname
  Returns "dev" vs "prod" based on URL
```

### Tracing Auth Flow:

Add console logs to trace:

```typescript
// In config.ts
export const initializeAuth = async (): Promise<string | null> => {
  console.log("[Auth] Starting initializeAuth");
  try {
    const auth = getFirebaseAuth();
    console.log("[Auth] Got Firebase Auth", auth);

    const userCredential = await signInAnonymously(auth);
    console.log("[Auth] Signed in anonymous user:", userCredential.user.uid);

    return userCredential.user.uid;
  } catch (error) {
    console.error("[Auth] Failed:", error);
    return null;
  }
};
```

Output should show:

```
[Auth] Starting initializeAuth
[Auth] Got Firebase Auth Auth {app: FirebaseAppImpl, ...}
[Auth] Signed in anonymous user: Qx8jK9mL2n3pQ4rS5tU6vW7x
```

---

## Summary: The Complete Loop

```
[1] USER OPENS APP
    ↓
[2] React renders RootLayout
    ↓
[3] AuthProvider useEffect checks: do we have userId?
    ↓
[4a] YES → Use cached one from localStorage
    Fast load, done in ms
    ↓
[4b] NO → Call initAuth() from store
    ↓
[5] Store calls initializeAuth() from config
    ↓
[6] Config reads NEXT_PUBLIC_FIREBASE_* env vars
    ↓
[7] Config initializes Firebase SDK
    (getFirebaseApp → initializeApp)
    ↓
[8] Config gets Auth service
    (getFirebaseAuth → getAuth)
    ↓
[9] Config calls signInAnonymously()
    [NETWORK REQUEST]
    ↓
[10] Firebase Backend creates anonymous account
    Returns UID: "Qx8jK9mL2n3pQ4rS5tU6vW7x"
    ↓
[11] Client receives UID
    ↓
[12] Store calls: set({ userId: "Qx8jK9mL2n3pQ4rS5tU6vW7x" })
    ↓
[13] Persist middleware saves to localStorage
    ↓
[14] React notifies subscribers of state change
    ↓
[15] AuthProvider re-renders, sees userId exists
    ↓
[16] App is ready
    Children components render
    User can now create/join rooms
    ↓
[17] When user creates room:
    Firebase functions use store.userId
    To identify which player in room
    ↓
[18] On page reload:
    Back to step [4a] (instant reload)
    localStorage has saved userId
    No auth network call needed
```

---

## Code Reference

### Files Involved

| File                               | Responsibility                                            |
| ---------------------------------- | --------------------------------------------------------- |
| `src/lib/firebase/config.ts`       | Firebase SDK init, env var validation, singleton pattern  |
| `src/lib/beta/store.ts`            | Zustand store, initAuth action, state persistence         |
| `src/components/auth-provider.tsx` | React component, useEffect trigger, dependency management |
| `src/app/layout.tsx`               | Wraps app with AuthProvider                               |
| `.env.local`                       | Contains Firebase credentials (local only)                |

### Key Exports

```typescript
// From config.ts
export const getFirebaseApp: () => FirebaseApp
export const getFirebaseAuth: () => Auth
export const getDb: () => Firestore
export const initializeAuth: () => Promise<string | null>

// From store.ts
export const useBetaStore: () => {
  userId: string | null
  initAuth: () => Promise<void>
  // ... other state and actions
}

// From auth-provider.tsx
export function AuthProvider: (props: AuthProviderProps) => JSX.Element
```
