import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { StateBlock } from "../components/StateBlock";
import { RequesterContext } from "../context/RequesterContext";

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { user, loading: authLoading, isLegacyTest } = useAuth();
  const location = useLocation();

  const reqCtx = React.useContext(RequesterContext);

  if (authLoading || (isLegacyTest && reqCtx?.loading)) {
    return <StateBlock variant="loading" message="Verifying session…" />;
  }

  // 1. Authenticated session (Lab 3)
  if (user) {
    if (user.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return children ? <>{children}</> : <Outlet />;
  }

  // 2. Lab 2 legacy test compatibility
  if (isLegacyTest || localStorage.getItem("toktickit_requester_id")) {
    if (reqCtx?.selectedRequester) {
      return children ? (
        <React.Fragment key={reqCtx.contextKey}>{children}</React.Fragment>
      ) : (
        <Outlet />
      );
    }
    return <Navigate to="/select-requester" replace />;
  }

  // 3. Unauthenticated visitor
  return <Navigate to="/login" state={{ from: location }} replace />;
}
