/**
 * useAuthForm — encapsulates login/register form state and submission logic.
 *
 * Keeping form submission logic in a hook (not in the component) means:
 *  - The component stays purely presentational.
 *  - The hook is independently testable.
 */

import { useState, useCallback } from "react";
import { authService } from "../../../services/auth.service";
import type { AuthCredentials, RegisterCredentials } from "../../../types";

interface UseAuthFormReturn {
  isLoading: boolean;
  error: string | null;
  login: (creds: AuthCredentials) => Promise<void>;
  register: (creds: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthForm = (): UseAuthFormReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (creds: AuthCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.login(creds);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (creds: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.register(creds);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, login, register, logout, clearError };
};

// ─── Error Formatter ─────────────────────────────────────────────────────────

function formatFirebaseError(err: unknown): string {
  if (err instanceof Error) {
    // Map Firebase error codes to human-readable messages.
    const code = (err as { code?: string }).code;
    const messages: Record<string, string> = {
      "auth/invalid-email": "Invalid email address.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/invalid-credential": "Invalid email or password.",
    };
    return code && messages[code] ? messages[code] : err.message;
  }
  return "An unexpected error occurred.";
}
