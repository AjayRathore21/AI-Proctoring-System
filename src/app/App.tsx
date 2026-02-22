/**
 * App — root component.
 *
 * Wraps the entire tree with AuthProvider so that auth state
 * is available to every component, including route guards.
 */

import React from "react";
import { AuthProvider } from "../context/AuthContext";
import { AppRouter } from "./Router";

const App: React.FC = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);

export default App;
