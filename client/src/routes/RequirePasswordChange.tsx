import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { StateBlock } from '../components/StateBlock'
import { getDefaultRouteForRole } from '../utils/navigation'

export function RequirePasswordChange({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <StateBlock variant="loading" message="Verifying session…" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.mustChangePassword) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
