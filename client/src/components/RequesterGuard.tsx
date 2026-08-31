import React from 'react'
import { Navigate } from 'react-router-dom'

import { useRequester } from '../context/RequesterContext'
import StateBlock from './StateBlock'

export interface RequesterGuardProps {
  children: React.ReactNode
}

export function RequesterGuard({ children }: RequesterGuardProps) {
  const { selectedRequester, loading, contextKey } = useRequester()

  if (loading) {
    return <StateBlock variant="loading" message="Loading…" />
  }

  if (!selectedRequester) {
    return <Navigate to="/select-requester" replace />
  }

  // Keying by contextKey ensures that changing Requester discards all
  // previously loaded requester-specific component state (BR-09, AC-04).
  return <React.Fragment key={contextKey}>{children}</React.Fragment>
}

export default RequesterGuard
