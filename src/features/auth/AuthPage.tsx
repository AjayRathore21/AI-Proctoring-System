/**
 * AuthPage — container for login/register flow.
 *
 * Owns the tab state (login vs register) and delegates to the
 * respective form components. Uses useAuthForm for all business logic.
 */

import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { useAuth } from "../../context/AuthContext";
import { useAuthForm } from "./hooks/useAuthForm";

type Tab = "login" | "register";

export const AuthPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading, error, login, register, clearError } = useAuthForm();
  const [tab, setTab] = useState<Tab>("login");

  // Redirect once auth resolves and user is signed in.
  if (!authLoading && user) {
    return <Navigate to="/lobby" replace />;
  }

  const handleTabSwitch = (next: Tab) => {
    clearError();
    setTab(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h8a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V10a2 2 0 012-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">VideoCall</h1>
          <p className="text-white/50 text-sm mt-1">Secure 1:1 video calling</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6 text-center">
            {tab === "login" ? "Welcome back" : "Create your account"}
          </h2>

          {tab === "login" ? (
            <LoginForm
              onSubmit={login}
              isLoading={isLoading}
              error={error}
              onClearError={clearError}
              onSwitchToRegister={() => handleTabSwitch("register")}
            />
          ) : (
            <RegisterForm
              onSubmit={register}
              isLoading={isLoading}
              error={error}
              onClearError={clearError}
              onSwitchToLogin={() => handleTabSwitch("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
};
