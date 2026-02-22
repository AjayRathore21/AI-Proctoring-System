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
import { doc, setDoc, getDoc } from "firebase/firestore";
import type { User, UserCredential } from "firebase/auth";
import { auth, db } from "./firebase.service";
import type { AuthCredentials, RegisterCredentials, AppUser, UserRole } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mapFirebaseUser = async (user: User): Promise<AppUser> => {
  // Fetch user role from Firestore
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data();
  
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName,
    role: (userData?.role as UserRole) ?? "interviewee", // Default to interviewee if not set
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Creates a new account and sets displayName on the Firebase profile.
   * Also saves user role to Firestore.
   */
  async register({ email, password, displayName, role }: RegisterCredentials): Promise<AppUser> {
    const credential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(credential.user, { displayName });
    
    // Save user role to Firestore
    await setDoc(doc(db, "users", credential.user.uid), {
      role,
      email,
      displayName,
      createdAt: new Date().toISOString(),
    });
    
    return mapFirebaseUser(credential.user);
  },

  /**
   * Signs in with email + password.
   * Role is fetched from Firestore user document.
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
  async getCurrentUser(): Promise<AppUser | null> {
    const user = auth.currentUser;
    return user ? await mapFirebaseUser(user) : null;
  },

  /**
   * Subscribes to Firebase auth state changes.
   * Returns an unsubscribe function — critical for preventing memory leaks.
   */
  onAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        mapFirebaseUser(firebaseUser).then(callback).catch(() => callback(null));
      } else {
        callback(null);
      }
    });
  },
};
