// api/auth.js
// Placeholder auth hook — replace with your real auth context/provider.
// Expected to return { role: "admin" | "staff" | null, isLoading: boolean }.

import { useContext, createContext, useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { api } from "./client";

export const AuthContext = createContext({
  role: null,
  isLoading: false,
  login: async () => {},
  logout: async () => {},
  setDevRole: () => {},
});

export function useCurrentUser() {
  return useContext(AuthContext);
}

// Fetches the current session once on mount, and exposes login/logout/
// setDevRole, all via AuthContext.
//
// ASSUMPTIONS (update these to match your actual backend once it exists):
// - GET  /api/auth/me     → { role: "admin" | "staff" } on success, 401 if no session
// - POST /api/auth/login  → body { username, password }, returns { role } on success
// - POST /api/auth/logout → clears the session server-side
//
// While there's no backend yet, the app starts every visit at /login as
// normal. From there, the "Continue as ... (dev)" buttons on LoginPage call
// setDevRole() to fake being logged in, without touching the network, so
// you can browse the rest of the app. Once your backend exists, delete
// setDevRole and the bypass buttons on LoginPage — the real login form
// already works independently of this.
export function AuthProvider({ children }) {
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const me = await api.getCurrentUser();
        if (!cancelled) setRole(me?.role ?? null);
      } catch {
        // No session (401), no backend yet, or the request failed —
        // treat as logged out either way.
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await api.login(credentials); // throws ApiError on failure
    setRole(result?.role ?? null);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      // Clear client-side role even if the network call fails, so the UI
      // doesn't get stuck showing a logged-in state.
      setRole(null);
    }
  }, []);

  // Dev-only: set role directly, no network call. See LoginPage's bypass buttons.
  const setDevRole = useCallback((devRole) => {
    setRole(devRole);
  }, []);

  return (
    <AuthContext.Provider value={{ role, isLoading, login, logout, setDevRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// Where an authenticated-but-wrong-role user lands, if the caller doesn't
// specify redirectTo. Update these paths to match your actual router.
function defaultRouteForRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "staff") return "/staff/dashboard";
  return "/login";
}

// Guards a route by role. Unauthenticated users are sent to /login;
// authenticated users with the wrong role are redirected to their own
// dashboard (or redirectTo, if provided) rather than shown an inline
// "no access" message, so a wrong-role visit doesn't dead-end on a blank
// permissions screen.
export function RoleGuard({ allow, children, redirectTo }) {
  const { role, isLoading } = useCurrentUser();

  if (isLoading) return <p className="state-msg">Checking access…</p>;

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(role)) {
    return <Navigate to={redirectTo || defaultRouteForRole(role)} replace />;
  }

  return children;
}