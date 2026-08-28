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

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // A token in storage is not proof of a session: it may be expired or revoked. The only way to
    // find out is to spend one request on it before the app decides what to render.
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        // Dropping the dead token here keeps the next reload from repeating this round trip.
        clearToken()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const signOut = async () => {
    try {
      await logout()
    } catch {
      // A failed server logout must not trap the user in a session they asked to leave. The
      // refresh token then outlives the click, but it expires on its own and the local token
      // is gone either way.
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
