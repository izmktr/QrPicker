// src/lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebaseの設定が完全でない場合はnullを返す
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  // すべての必要な環境変数が設定されているかチェック
  if (firebaseConfig.apiKey && 
      firebaseConfig.authDomain && 
      firebaseConfig.projectId && 
      firebaseConfig.storageBucket && 
      firebaseConfig.messagingSenderId && 
      firebaseConfig.appId) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn('Firebase configuration is incomplete. Some features may not work.');
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

export { auth, db };