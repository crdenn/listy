/**
 * Firebase Configuration
 * 
 * This file initializes the Firebase app and exports the services we need.
 * All Firebase initialization happens here to ensure we only create one instance.
 * 
 * Important: Firebase config values are public and safe to expose.
 * Security is enforced through Firebase Security Rules, not by hiding these values.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate that we have the required config
function validateConfig(): void {
  const required = [
    { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
    { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
    { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
  ];
  
  const missing = required
    .filter(entry => !entry.value)
    .map(entry => entry.key);
  
  if (missing.length > 0) {
    console.error(
      `Missing required Firebase configuration: ${missing.join(', ')}. ` +
      'Check your .env.local file.'
    );
  }
}

// Initialize Firebase (singleton pattern to prevent multiple instances)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function initializeFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  validateConfig();
  
  // Only initialize if no apps exist
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Connect to emulators in development if configured
  // Uncomment these lines if you're using Firebase emulators locally
  // if (process.env.NODE_ENV === 'development') {
  //   connectAuthEmulator(auth, 'http://localhost:9099');
  //   connectFirestoreEmulator(db, 'localhost', 8080);
  // }
  
  return { app, auth, db };
}

// Initialize on import
const firebase = initializeFirebase();

export { firebase };
export const firebaseApp = firebase.app;
export const firebaseAuth = firebase.auth;
export const firebaseDb = firebase.db;
