import React, { useState } from "react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { ErrorBanner } from "../../../components/ui/ErrorBanner";
import type { RegisterCredentials, UserRole } from "../../../types";

interface RegisterFormProps {
  onSubmit: (creds: RegisterCredentials) => void;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  isLoading,
  error,
  onClearError,
  onSwitchToLogin,
}) => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("interviewee");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    setLocalError(null);
    onSubmit({ displayName, email, password, role });
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {displayError && (
        <ErrorBanner
          message={displayError}
          onDismiss={() => {
            setLocalError(null);
            onClearError();
          }}
        />
      )}

      <Input
        id="displayName"
        type="text"
        label="Full Name"
        placeholder="Jane Doe"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        autoComplete="name"
      />

      <Input
        id="reg-email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <Input
        id="reg-password"
        type="password"
        label="Password"
        placeholder="Min. 6 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
      />

      <Input
        id="confirm-password"
        type="password"
        label="Confirm Password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
      />

      {/* Role Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-white/90">Role</label>
        <div className="flex gap-3">
          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="interviewer"
              checked={role === "interviewer"}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="sr-only"
            />
            <div
              className={`px-4 py-2.5 rounded-xl text-center text-sm font-medium transition-all ${
                role === "interviewer"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              Interviewer
            </div>
          </label>
          <label className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="interviewee"
              checked={role === "interviewee"}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="sr-only"
            />
            <div
              className={`px-4 py-2.5 rounded-xl text-center text-sm font-medium transition-all ${
                role === "interviewee"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              Interviewee
            </div>
          </label>
        </div>
      </div>

      <Button type="submit" isLoading={isLoading} className="mt-2">
        Create Account
      </Button>

      <p className="text-center text-sm text-white/50">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
};
