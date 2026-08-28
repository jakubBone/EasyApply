import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../../components/auth/ProtectedRoute'
import { useAuth } from '../../components/auth/AuthProvider'

// Mocking useAuth keeps this about redirect behaviour rather than the fetch behind it.
vi.mock('../../components/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

// Renders ProtectedRoute in a realistic router environment.
// The /login route stands in for the real page, so the assertion can prove Navigate
// actually routed there rather than just rendering nothing.
function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/" element={<div>Landing page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('while loading — renders null (prevents redirect flash)', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
      signOut: vi.fn(),
    })

    const { container } = renderProtectedRoute()
    expect(container).toBeEmptyDOMElement()
  })

  it('unauthenticated — redirects to /', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      signOut: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByText('Landing page')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('authenticated — renders protected content', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      signOut: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })
})
