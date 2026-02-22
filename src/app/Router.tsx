/**
 * Router — declarative route configuration for the application.
 *
 * Route groups:
 *  - Public routes  (/) → AuthPage        [redirect to /lobby if authenticated]
 *  - Protected routes   → LobbyPage, CallPage  [redirect to / if not authenticated]
 *  - Fallback           → redirect to /
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { PublicRoute } from "../routes/PublicRoute";
import { AuthPage } from "../features/auth/AuthPage";
import { LobbyPage } from "../features/room/LobbyPage";
import { CallPage } from "../features/room/CallPage";

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Public — only accessible when NOT authenticated */}
      <Route element={<PublicRoute />}>
        <Route path="/" element={<AuthPage />} />
      </Route>

      {/* Protected — only accessible when authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/call/:roomId" element={<CallPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
