/**
 * PublicRoute — redirects authenticated users away from auth pages.
 * Prevents a signed-in user from seeing the login screen.
 */

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui/Spinner";

export const PublicRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  return !user ? <Outlet /> : <Navigate to="/lobby" replace />;
};
