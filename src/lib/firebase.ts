/**
 * FIGHT ZONE SA - Firebase Core Configuration
 * 
 * Get your free Firebase config at console.firebase.google.com —
 * 1. Create a project
 * 2. Enable Authentication (Email/Password + Google Sign-In)
 * 3. Enable Firestore Database in Test Mode or Production (with core rules)
 * 4. Paste your config below or run the automatic AI Studio Setup.
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import injectedConfig from '../../firebase-applet-config.json';

// DEFAULT / FALLBACK CONFIG
// Users can paste their config object here directly if needed
const manualFirebaseConfig = {
  apiKey: "AIzaSyDummyKeyPlaceholderFightZoneSA2026",
  authDomain: "fight-zone-sa.firebaseapp.com",
  projectId: "fight-zone-sa",
  storageBucket: "fight-zone-sa.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:dummy"
};

// Attempt to load standard injected config if it exists
const firebaseConfig = (injectedConfig && (injectedConfig as any).apiKey) 
  ? (injectedConfig as any) 
  : manualFirebaseConfig;

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
export { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, getDocFromServer } from 'firebase/firestore';
export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from 'firebase/auth';
export { FirebaseError } from 'firebase/app';
export { OperationType } from '../types';

// Connection validator (Required by the firebase-integration skill)
import { doc as fDoc, getDocFromServer as fGetDocFromServer } from 'firebase/firestore';
export async function testFirestoreConnection() {
  try {
    await fGetDocFromServer(fDoc(db, 'test', 'connection'));
    console.log("Firestore connection test completed.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration. The client appears to be offline.");
    }
  }
}
