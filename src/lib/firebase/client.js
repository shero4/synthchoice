import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAEZvvtbdvGie5_pCLfB9dWhpiAuo6eKN0",
  authDomain: "synthchoice.firebaseapp.com",
  projectId: "synthchoice",
  storageBucket: "synthchoice.firebasestorage.app",
  messagingSenderId: "729115309986",
  appId: "1:729115309986:web:c92934ef60867bd2f164fb",
  measurementId: "G-EK5HGVPK26",
};

// Initialize Firebase (singleton pattern for Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { app };
