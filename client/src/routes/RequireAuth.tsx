import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { StateBlock } from "../components/StateBlock";

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <StateBlock variant="loading" message="Verifying session…" />;
  }

  // 1. Authenticated session (Lab 3)
  if (user) {
    if (user.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return children ? <>{children}</> : <Outlet />;
  }

  // 3. Unauthenticated visitor
  return <Navigate to="/login" state={{ from: location }} replace />;
}
