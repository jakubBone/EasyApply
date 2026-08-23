import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Guards a route against unauthenticated users.
 *
 * Scenarios:
 * - Token verification in progress (isLoading) → render nothing (avoid redirect flash)
 * - Not authenticated → redirect to /login
 * - Authenticated → render children
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
