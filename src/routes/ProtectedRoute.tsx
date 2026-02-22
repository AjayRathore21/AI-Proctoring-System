/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * Shows a full-screen spinner while auth state is resolving (isLoading)
 * to prevent a flash of the login page for authenticated users on refresh.
 * Once resolved, redirects unauthenticated users to "/".
 */

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui/Spinner";

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/" replace />;
};
