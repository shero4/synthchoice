import { signInAnonymously as firebaseSignInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "./client";

/**
 * Sign in anonymously
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function signInAnonymously() {
  return firebaseSignInAnonymously(auth);
}

/**
 * Get the current user (may be null if not signed in)
 * @returns {import("firebase/auth").User | null}
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 * @param {(user: import("firebase/auth").User | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Wait for auth to be ready
 * @returns {Promise<import("firebase/auth").User | null>}
 */
function waitForAuthReady() {
  return new Promise((resolve) => {
    // If already have a user, resolve immediately
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    // Otherwise wait for first auth state change
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Ensure user is signed in (anonymous if needed)
 * @returns {Promise<import("firebase/auth").User>}
 */
export async function ensureAuth() {
  // Wait for auth to initialize
  const currentUser = await waitForAuthReady();
  if (currentUser) {
    return currentUser;
  }
  // Sign in anonymously
  const credential = await signInAnonymously();
  return credential.user;
}
