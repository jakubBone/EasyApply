import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'

interface ProtectedRouteProps {
  children: ReactNode
}

// Rendering nothing while the token is being verified is the point: treating "not yet known"
// as "not logged in" would bounce every returning user to the landing page for a frame before
// snapping back. A blank moment is cheaper than that flash.
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
