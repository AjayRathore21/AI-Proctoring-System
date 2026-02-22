/**
 * AuthContext — provides authentication state to the entire React tree.
 *
 * Pattern: Context + custom hook (useAuth).
 *  - Context stores the auth state (user, loading).
 *  - AuthProvider subscribes to Firebase auth changes exactly once.
 *  - Components never interact with Firebase directly; they consume useAuth().
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { authService } from "../services/auth.service";
import type { AppUser } from "../types";

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  // Start in loading state so protected routes don't flash before auth resolves.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth changes and unsubscribe on unmount (memory leak prevention).
    const unsubscribe = authService.onAuthStateChanged((appUser) => {
      setUser(appUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth — the canonical way to access auth state in any component.
 * Throws if used outside AuthProvider to catch misuse early.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
};
