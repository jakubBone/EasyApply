import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConsentGate } from './ConsentGate'
import { AuthProvider } from '../../auth/AuthProvider'
import * as api from '../../services/api'

// Mock API
vi.mock('../../services/api', () => ({
  fetchCurrentUser: vi.fn(),
  getToken: vi.fn(),
  clearToken: vi.fn(),
  logout: vi.fn(),
  acceptConsent: vi.fn(),
  deleteAccount: vi.fn(),
}))

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'consent.title': 'Before you start',
        'consent.description': 'To use Applikon, you must accept the privacy policy.',
        'consent.linkToPolicy': 'Read privacy policy',
        'consent.checkbox': 'I have read and accept the privacy policy',
        'consent.acceptButton': 'Accept and continue',
        'consent.logoutButton': 'Log out',
        'consent.loading': 'Processing...',
        'consent.error': 'Failed to accept privacy policy',
      }
      return translations[key] || key
    },
    i18n: { language: 'en' },
  }),
}))

const TestWrapper = ({ user, children }: { user: any; children: React.ReactNode }) => {
  vi.mocked(api.fetchCurrentUser).mockResolvedValue(user)
  vi.mocked(api.getToken).mockReturnValue('test-token')

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

describe('ConsentGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when user has accepted privacy policy', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      privacyPolicyAcceptedAt: '2026-04-23T10:00:00',
    }

    render(
      <TestWrapper user={user}>
        <ConsentGate>
          <div>Dashboard Content</div>
        </ConsentGate>
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    })
  })

  it('shows consent screen when user has NOT accepted privacy policy', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      privacyPolicyAcceptedAt: null,
    }

    render(
      <TestWrapper user={user}>
        <ConsentGate>
          <div>Dashboard Content</div>
        </ConsentGate>
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Before you start')).toBeInTheDocument()
      expect(screen.getByText(/To use Applikon/)).toBeInTheDocument()
    })

    // Should NOT render dashboard
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })

  it('requires checkbox to enable accept button', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      privacyPolicyAcceptedAt: null,
    }

    render(
      <TestWrapper user={user}>
        <ConsentGate>
          <div>Dashboard Content</div>
        </ConsentGate>
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Before you start')).toBeInTheDocument()
    })

    const acceptButton = screen.getByRole('button', { name: /Accept and continue/i })
    const checkbox = screen.getByRole('checkbox')

    // Button should be disabled initially
    expect(acceptButton).toBeDisabled()

    // Check the checkbox
    await userEvent.click(checkbox)

    // Button should now be enabled
    expect(acceptButton).not.toBeDisabled()
  })

  it('calls acceptConsent when user clicks Accept', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      privacyPolicyAcceptedAt: null,
    }

    vi.mocked(api.acceptConsent).mockResolvedValue(undefined)

    render(
      <TestWrapper user={user}>
        <ConsentGate>
          <div>Dashboard Content</div>
        </ConsentGate>
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Before you start')).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('checkbox')
    const acceptButton = screen.getByRole('button', { name: /Accept and continue/i })

    await userEvent.click(checkbox)
    await userEvent.click(acceptButton)

    await waitFor(() => {
      expect(api.acceptConsent).toHaveBeenCalled()
    })
  })

  it('shows error message on accept failure', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      privacyPolicyAcceptedAt: null,
    }

    vi.mocked(api.acceptConsent).mockRejectedValue(new Error('API error'))

    render(
      <TestWrapper user={user}>
        <ConsentGate>
          <div>Dashboard Content</div>
        </ConsentGate>
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Before you start')).toBeInTheDocument()
    })

    const checkbox = screen.getByRole('checkbox')
    const acceptButton = screen.getByRole('button', { name: /Accept and continue/i })

    await userEvent.click(checkbox)
    await userEvent.click(acceptButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to accept privacy policy/)).toBeInTheDocument()
    })
  })

  it('calls logout when user clicks Log out button', async () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      privacyPolicyAcceptedAt: null,
    }

    vi.mocked(api.logout).mockResolvedValue(undefined)

    render(
      <TestWrapper user={user}>
        <ConsentGate>
          <div>Dashboard Content</div>
        </ConsentGate>
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Before you start')).toBeInTheDocument()
    })

    const logoutButton = screen.getByRole('button', { name: /Log out/i })
    await userEvent.click(logoutButton)

    await waitFor(() => {
      expect(api.logout).toHaveBeenCalled()
    })
  })
})
