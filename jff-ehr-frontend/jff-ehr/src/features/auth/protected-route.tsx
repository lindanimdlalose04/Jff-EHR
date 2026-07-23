import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./auth-context";

/** Redirects unauthenticated visitors to /login, remembering where they were headed. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, initialising } = useAuth();
  const location = useLocation();

  if (initialising) {
    return <div className="p-6 text-sm text-muted">Loading…</div>;
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
