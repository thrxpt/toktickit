import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { StateBlock } from '../components/StateBlock'
import type { UserRole } from '../types/auth'

export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[]
  children?: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <StateBlock variant="loading" message="Verifying permissions…" />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="container py-4">
        <StateBlock
          variant="error"
          title="Access Denied"
          message="You do not have permission to access this page."
        />
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
