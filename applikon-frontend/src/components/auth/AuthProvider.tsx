import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../../types/domain'
import { fetchCurrentUser, getToken, clearToken, logout } from '../../services/api'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
}

// ============================================================
// Context
// createContext with undefined as initial value — enforces that
// useAuth() is only used inside AuthProvider (checked below).
// ============================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ============================================================
// Provider
// ============================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // On app start, check if we have a token and fetch the user data.
    // If the token has expired or doesn't exist — user stays null.
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        // Invalid token — clear it and leave user unauthenticated
        clearToken()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const signOut = async () => {
    try {
      await logout()
    } catch {
      // Backend unreachable — log out locally anyway
    }
    clearToken()
    sessionStorage.removeItem('dismissed_notices')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: user !== null, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================
// Hook
// ============================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
