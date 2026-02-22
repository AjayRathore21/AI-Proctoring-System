/**
 * AuthService — pure business logic for Firebase Authentication.
 *
 * Keeping auth logic here (not in components or hooks) means:
 *  - Components remain dumb/presentational.
 *  - The service can be unit-tested independently of React.
 *  - Swapping auth providers only touches this file.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import type { User, UserCredential } from "firebase/auth";
import { auth } from "./firebase.service";
import type { AuthCredentials, RegisterCredentials, AppUser } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mapFirebaseUser = (user: User): AppUser => ({
  uid: user.uid,
  email: user.email ?? "",
  displayName: user.displayName,
});

// ─── Public API ───────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Creates a new account and sets displayName on the Firebase profile.
   */
  async register({ email, password, displayName }: RegisterCredentials): Promise<AppUser> {
    const credential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(credential.user, { displayName });
    return mapFirebaseUser(credential.user);
  },

  /**
   * Signs in with email + password.
   */
  async login({ email, password }: AuthCredentials): Promise<AppUser> {
    const credential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return mapFirebaseUser(credential.user);
  },

  /**
   * Signs out the current user.
   */
  async logout(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Returns the currently authenticated user or null.
   * Used for initializing auth state on page load.
   */
  getCurrentUser(): AppUser | null {
    const user = auth.currentUser;
    return user ? mapFirebaseUser(user) : null;
  },

  /**
   * Subscribes to Firebase auth state changes.
   * Returns an unsubscribe function — critical for preventing memory leaks.
   */
  onAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
    return onAuthStateChanged(auth, (firebaseUser) => {
      callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
    });
  },
};
