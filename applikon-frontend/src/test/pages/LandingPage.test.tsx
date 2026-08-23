import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from '../../pages/LandingPage'
import { useAuth } from '../../components/auth/AuthProvider'

vi.mock('../../components/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

function renderLandingPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/privacy" element={<div>Privacy Policy</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('LandingPage', () => {
  it('while loading — renders nothing (no flash)', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false, user: null, signOut: vi.fn() })
    const { container } = renderLandingPage()
    expect(container).toBeEmptyDOMElement()
  })

  it('unauthenticated — renders landing page content', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, user: null, signOut: vi.fn() })
    renderLandingPage()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByAltText('Applikon')).toBeInTheDocument()
    expect(screen.getByText('Wysłane')).toBeInTheDocument()
  })

  it('authenticated — redirects to /dashboard', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', name: 'Test' },
      signOut: vi.fn(),
    })
    renderLandingPage()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Wysłane')).not.toBeInTheDocument()
  })
})
