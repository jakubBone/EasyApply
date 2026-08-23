import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../components/auth/AuthProvider'

// Mock entire api module — AuthProvider shouldn't touch real fetch
vi.mock('../../services/api', () => ({
  getToken: vi.fn(),
  fetchCurrentUser: vi.fn(),
  clearToken: vi.fn(),
  logout: vi.fn(),
}))

import * as api from '../../services/api'

const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' }

// Helper component that exposes hook state for assertions
function AuthStateDisplay() {
  const { user, isLoading, isAuthenticated } = useAuth()
  if (isLoading) return <div>loading</div>
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.name ?? 'null'}</span>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('without token — isAuthenticated: false, does not call fetchCurrentUser', async () => {
    vi.mocked(api.getToken).mockReturnValue(null)

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
    expect(api.fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('with valid token — fetches user and sets isAuthenticated: true', async () => {
    vi.mocked(api.getToken).mockReturnValue('valid-token')
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(mockUser)

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    )

    // While loading, should show loading state
    expect(screen.getByText('loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('user')).toHaveTextContent('Test User')
    })
  })

  it('with invalid token — calls clearToken and stays unauthenticated', async () => {
    vi.mocked(api.getToken).mockReturnValue('expired-token')
    vi.mocked(api.fetchCurrentUser).mockRejectedValue(new Error('Unauthorized'))

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
    expect(api.clearToken).toHaveBeenCalledOnce()
  })

  it('signOut — calls backend logout, clears token and resets user state to null', async () => {
    vi.mocked(api.getToken).mockReturnValue('valid-token')
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(api.logout).mockResolvedValue(undefined)

    function SignOutButton() {
      const { isAuthenticated, signOut } = useAuth()
      return (
        <>
          <span data-testid="authenticated">{String(isAuthenticated)}</span>
          <button onClick={() => void signOut()}>auth.logout</button>
        </>
      )
    }

    render(
      <AuthProvider>
        <SignOutButton />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    await act(async () => { screen.getByText('auth.logout').click() })

    expect(api.logout).toHaveBeenCalledOnce()
    expect(api.clearToken).toHaveBeenCalled()
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('signOut — logs out locally even when backend call fails', async () => {
    vi.mocked(api.getToken).mockReturnValue('valid-token')
    vi.mocked(api.fetchCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(api.logout).mockRejectedValue(new Error('network error'))

    function SignOutButton() {
      const { isAuthenticated, signOut } = useAuth()
      return (
        <>
          <span data-testid="authenticated">{String(isAuthenticated)}</span>
          <button onClick={() => void signOut()}>auth.logout</button>
        </>
      )
    }

    render(
      <AuthProvider>
        <SignOutButton />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    await act(async () => { screen.getByText('auth.logout').click() })

    expect(api.clearToken).toHaveBeenCalled()
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('useAuth outside AuthProvider — throws error with readable message', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function BrokenComponent() {
      useAuth()
      return null
    }

    expect(() => render(<BrokenComponent />)).toThrow(
      'useAuth must be used within AuthProvider'
    )

    consoleSpy.mockRestore()
  })
})
