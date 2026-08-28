import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { Settings } from '../../pages/Settings'
import { AuthProvider } from '../../components/auth/AuthProvider'
import * as api from '../../services/api'

vi.mock('../../services/api', () => ({
  fetchCurrentUser: vi.fn(),
  getToken: vi.fn(),
  clearToken: vi.fn(),
  logout: vi.fn(),
  deleteAccount: vi.fn(),
  exportMyData: vi.fn(),
}))

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.loading': 'Loading...',
        'settings.title': 'Settings',
        'settings.accountSection': 'Account',
        'form.company': 'Email',
        'settings.privacyAcceptedAt': 'Privacy policy accepted:',
        'settings.dateLocale': 'en-US',
        'settings.dangerZone': 'Danger zone',
        'settings.deleteAccount.button': 'Delete account',
        'settings.deleteAccount.confirmTitle': 'Delete account?',
        'settings.deleteAccount.warning': 'This action is irreversible.',
        'settings.deleteAccount.confirmInputPrompt': 'Type DELETE to confirm',
        'settings.deleteAccount.confirmWord': 'DELETE',
        'settings.deleteAccount.cancel': 'Cancel',
        'settings.deleteAccount.confirm': 'Delete my account',
        'settings.deleteAccount.success': 'Account deleted',
        'settings.deleteAccount.error': 'Failed to delete account',
        'settings.exportTitle': 'Your data',
        'settings.exportDescription': 'Download all your data stored in Applikon.',
        'settings.exportButton': 'Download my data',
        'settings.exporting': 'Preparing...',
        'settings.exportError': 'Something went wrong. Try again.',
      }
      return translations[key] || key
    },
    i18n: { language: 'en' },
  }),
}))

// Mock Footer
vi.mock('../../components/layout/Footer', () => ({
  Footer: () => <div>Footer</div>,
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const user = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    privacyPolicyAcceptedAt: '2026-04-23T10:00:00',
  }
  vi.mocked(api.fetchCurrentUser).mockResolvedValue(user)
  vi.mocked(api.getToken).mockReturnValue('test-token')

  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock alert
    window.alert = vi.fn()
  })

  it('renders settings page with account info', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /👤/ })).toBeInTheDocument()
    })
  })

  it('displays privacy policy acceptance date', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    const accountBtn = await screen.findByRole('button', { name: /👤/ })
    await userEvent.click(accountBtn)

    await waitFor(() => {
      expect(screen.getByText(/Privacy policy accepted:/)).toBeInTheDocument()
    })
  })

  it('renders delete account button', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete account/i })).toBeInTheDocument()
    })
  })

  it('opens delete confirmation modal on button click', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /Delete account/i })
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Delete account?')).toBeInTheDocument()
      expect(screen.getByText(/This action is irreversible/)).toBeInTheDocument()
    })
  })

  it('requires confirmation word in modal', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /Delete account/i })
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Delete account?')).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /Delete my account/i })
    expect(confirmButton).toBeDisabled()

    // Type incorrect word
    const input = screen.getByPlaceholderText('DELETE')
    await userEvent.type(input, 'WRONG')
    expect(confirmButton).toBeDisabled()

    // Clear and type correct word
    await userEvent.clear(input)
    await userEvent.type(input, 'DELETE')
    expect(confirmButton).not.toBeDisabled()
  })

  it('calls deleteAccount API on confirmation', async () => {
    vi.mocked(api.deleteAccount).mockResolvedValue(undefined)

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /Delete account/i })
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Delete account?')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('DELETE')
    await userEvent.type(input, 'DELETE')

    const confirmButton = screen.getByRole('button', { name: /Delete my account/i })
    await userEvent.click(confirmButton)

    await waitFor(() => {
      expect(api.deleteAccount).toHaveBeenCalled()
    })
  })

  it('closes modal when cancel is clicked', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /Delete account/i })
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Delete account?')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await userEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('Delete account?')).not.toBeInTheDocument()
    })
  })

  it('renders export section in settings', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    const archiveBtn = await screen.findByRole('button', { name: /🗄️/ })
    await userEvent.click(archiveBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download my data/i })).toBeInTheDocument()
    })
  })

  it('calls exportMyData on button click', async () => {
    vi.mocked(api.exportMyData).mockResolvedValue(undefined)

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await userEvent.click(await screen.findByRole('button', { name: /🗄️/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download my data/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Download my data/i }))

    await waitFor(() => {
      expect(api.exportMyData).toHaveBeenCalledOnce()
    })
  })

  it('disables export button while exporting', async () => {
    let resolve: () => void
    vi.mocked(api.exportMyData).mockImplementation(
      () => new Promise<void>(r => { resolve = r })
    )

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await userEvent.click(await screen.findByRole('button', { name: /🗄️/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download my data/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Download my data/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Preparing.../i })).toBeDisabled()
    })

    resolve!()
  })

  it('shows error when exportMyData fails', async () => {
    vi.mocked(api.exportMyData).mockRejectedValue(new Error('network'))

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await userEvent.click(await screen.findByRole('button', { name: /🗄️/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download my data/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Download my data/i }))

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    })
  })

  it('hides error message after successful export', async () => {
    vi.mocked(api.exportMyData)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined)

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await userEvent.click(await screen.findByRole('button', { name: /🗄️/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download my data/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Download my data/i }))
    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /Download my data/i }))
    await waitFor(() => {
      expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
    })
  })

  it('shows error message on delete failure', async () => {
    vi.mocked(api.deleteAccount).mockRejectedValue(new Error('API error'))

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /Delete account/i })
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText('Delete account?')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('DELETE')
    await userEvent.type(input, 'DELETE')

    const confirmButton = screen.getByRole('button', { name: /Delete my account/i })
    await userEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to delete account/)).toBeInTheDocument()
    })
  })
})
