# Firebase Setup Guide

This document outlines the steps to connect this Next.js application to a Firebase project.

## Prerequisites

1.  **Create a Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click "Add project" and follow the on-screen instructions.

2.  **Enable Required Services:**
    *   In your new Firebase project, navigate to the "Build" section.
    *   **Authentication:**
        *   Go to "Authentication" -> "Sign-in method".
        *   Enable the **Google** provider.
    *   **Firestore Database:**
        *   Go to "Firestore Database" -> "Create database".
        *   Start in **production mode**.
        *   Choose a location for your database.
        *   You will need to configure security rules later.

## Setup Steps

### 1. Install Firebase SDK

Install the necessary Firebase client-side libraries for your project.

```bash
npm install firebase
```

### 2. Create Firebase Configuration File

You need to get your Firebase project's configuration credentials.

1.  In the Firebase Console, go to your Project's "Settings" (the gear icon) -> "Project settings".
2.  In the "General" tab, under "Your apps", click the web icon (`</>`) to create a new web app.
3.  Give your app a nickname and click "Register app".
4.  You will be presented with a `firebaseConfig` object. Copy this object.

Now, create a file at `src/lib/firebase.ts` and add the copied configuration:

```typescript
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
```

**IMPORTANT:** Replace the placeholder values (`YOUR_API_KEY`, etc.) with the actual credentials from your Firebase project. To keep these keys secure, it is highly recommended to use Environment Variables.

### 3. (Recommended) Use Environment Variables

To avoid committing sensitive keys to your repository, store them in an environment file.

1.  Create a file named `.env.local` in the root of your `qrpick` directory.
2.  Add your Firebase config values to this file, prefixed with `NEXT_PUBLIC_`:

    ```
    # .env.local
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
    ```

3.  Update your `src/lib/firebase.ts` to use these variables:

    ```typescript
    // src/lib/firebase.ts
    import { initializeApp, getApps, getApp } from "firebase/app";
    import { getAuth } from "firebase/auth";
    import { getFirestore } from "firebase/firestore";

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

    export const auth = getAuth(app);
    export const db = getFirestore(app);
    ```

4.  **IMPORTANT:** Add `.env.local` to your `.gitignore` file to prevent it from being tracked by Git. The `create-next-app` template should have already done this for you.

## Next Steps

With Firebase configured, you can now proceed with implementing the authentication and data storage features as outlined in `quickpick.txt`.
