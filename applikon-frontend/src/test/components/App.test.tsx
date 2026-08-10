import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import AppContent from '../../AppContent'
import { AuthProvider } from '../../auth/AuthProvider'
import * as api from '../../services/api'
import { QueryWrapper } from '../test-utils'

const renderApp = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </MemoryRouter>,
    { wrapper: QueryWrapper }
  )

// Mock all API functions
vi.mock('../../services/api', () => ({
  fetchApplications: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  updateApplicationStatus: vi.fn(),
  updateApplicationStage: vi.fn(),
  checkDuplicate: vi.fn(),
  deleteApplication: vi.fn(),
  fetchBadgeStats: vi.fn(),
  fetchCVs: vi.fn(),
  deleteCV: vi.fn(),
  assignCVToApplication: vi.fn(),
  getToken: vi.fn(() => null),
  fetchCurrentUser: vi.fn(),
  logout: vi.fn(),
  fetchActiveNotices: vi.fn(),
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Default mocks
    vi.mocked(api.fetchApplications).mockResolvedValue([])
    vi.mocked(api.fetchBadgeStats).mockResolvedValue({
      totalRejections: 0,
      totalGhosting: 0,
      totalOffers: 0,
      sweetRevengeUnlocked: false,
      rejectionBadge: { name: null },
      ghostingBadge: { name: null }
    } as never)
    vi.mocked(api.checkDuplicate).mockResolvedValue([])
    vi.mocked(api.fetchCVs).mockResolvedValue([])
    vi.mocked(api.fetchActiveNotices).mockResolvedValue([])
  })

  // ==================== INITIAL RENDERING Tests ====================

  describe('Initial Rendering', () => {
    it('renders app header', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText(/Applikon/i)).toBeInTheDocument()
      })
    })

    it('renders add application button', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('+ Dodaj aplikację')).toBeInTheDocument()
      })
    })

    it('renders view tabs (Kanban, Lista, CV)', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText('Kanban')).toBeInTheDocument()
        expect(screen.getByText('Lista')).toBeInTheDocument()
        expect(screen.getByText('CV')).toBeInTheDocument()
      })
    })

    it('shows loading message', async () => {
      // Delay the API response
      vi.mocked(api.fetchApplications).mockImplementation(() => new Promise(() => {}))

      renderApp()

      expect(screen.getByText('Ładowanie...')).toBeInTheDocument()
    })

    it('fetches applications on mount', async () => {
      renderApp()

      await waitFor(() => {
        expect(api.fetchApplications).toHaveBeenCalledTimes(1)
      })
    })
  })

  // ==================== VIEW SWITCHING Tests ====================

  describe('View Switching', () => {
    it('switches to list view', async () => {
      vi.mocked(api.fetchApplications).mockResolvedValue([
        { id: 1, company: 'Google', position: 'Dev', status: 'SENT', appliedAt: new Date().toISOString() } as never
      ])

      renderApp()

      await waitFor(() => {
        expect(screen.queryByText('Ładowanie...')).not.toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Lista'))

      // Should switch to table view
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    it('switches to CV view', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.queryByText('Ładowanie...')).not.toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('CV'))

      await waitFor(() => {
        expect(screen.getByText(/Moje CV/i)).toBeInTheDocument()
      })
    })
  })

  // ==================== APPLICATION FORM Tests ====================

  describe('Application Form', () => {
    it('opens form on button click', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.queryByText('Ładowanie...')).not.toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('+ Dodaj aplikację'))

      await waitFor(() => {
        expect(screen.getByText('Dodaj nową aplikację')).toBeInTheDocument()
      })
    })

    it('closes form on Cancel click', async () => {
      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await waitFor(() => {
        expect(screen.getByText('Dodaj nową aplikację')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Anuluj'))

      await waitFor(() => {
        expect(screen.queryByText('Dodaj nową aplikację')).not.toBeInTheDocument()
      })
    })

    it('displays form fields', async () => {
      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await waitFor(() => {
        expect(screen.getByLabelText(/Firma/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Stanowisko/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Źródło/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Link do oferty/)).toBeInTheDocument()
      })
    })

    it('creates application after filling form', async () => {
      const user = userEvent.setup()

      vi.mocked(api.createApplication).mockResolvedValue({
        id: 1,
        company: 'Google',
        position: 'Developer',
        status: 'SENT',
        appliedAt: new Date().toISOString()
      } as never)

      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await user.type(screen.getByLabelText(/Firma/), 'Google')
      await user.type(screen.getByLabelText(/Stanowisko/), 'Developer')

      fireEvent.click(screen.getByText('Dodaj aplikację'))

      await waitFor(() => {
        expect(api.createApplication).toHaveBeenCalledWith(
          expect.objectContaining({
            company: 'Google',
            position: 'Developer'
          })
        )
      })
    })
  })

  // ==================== DUPLICATE CHECKING Tests ====================

  describe('Duplicate Checking', () => {
    it('displays duplicate warning', async () => {
      const user = userEvent.setup()

      vi.mocked(api.checkDuplicate).mockResolvedValue([
        {
          id: 1,
          company: 'Google',
          position: 'Developer',
          appliedAt: '2024-01-15T10:00:00'
        } as never
      ])

      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await user.type(screen.getByLabelText(/Firma/), 'Google')
      await user.type(screen.getByLabelText(/Stanowisko/), 'Developer')

      fireEvent.click(screen.getByText('Dodaj aplikację'))

      await waitFor(() => {
        expect(screen.getByText(/Już aplikowałeś do Google/)).toBeInTheDocument()
      })
    })

    it('allows continuing despite duplicate', async () => {
      const user = userEvent.setup()

      vi.mocked(api.checkDuplicate).mockResolvedValue([
        {
          id: 1,
          company: 'Google',
          position: 'Developer',
          appliedAt: '2024-01-15T10:00:00'
        } as never
      ])

      vi.mocked(api.createApplication).mockResolvedValue({
        id: 2,
        company: 'Google',
        position: 'Developer',
        status: 'SENT',
        appliedAt: new Date().toISOString()
      } as never)

      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await user.type(screen.getByLabelText(/Firma/), 'Google')
      await user.type(screen.getByLabelText(/Stanowisko/), 'Developer')

      // First click - shows warning
      fireEvent.click(screen.getByText('Dodaj aplikację'))

      await waitFor(() => {
        expect(screen.getByText(/Kontynuuj mimo duplikatu/)).toBeInTheDocument()
      })

      // Second click - creates anyway
      fireEvent.click(screen.getByText(/Kontynuuj mimo duplikatu/))

      await waitFor(() => {
        expect(api.createApplication).toHaveBeenCalled()
      })
    })
  })

  // ==================== SALARY FORM Tests ====================

  describe('Salary Form', () => {
    it('shows single amount field by default', async () => {
      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await waitFor(() => {
        const salaryInputs = screen.getAllByPlaceholderText(/Kwota|Od/)
        expect(salaryInputs).toHaveLength(1)
      })
    })

    it('shows salary range after checkbox check', async () => {
      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /Widełki/i })
        fireEvent.click(checkbox)
      })

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Od')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Do')).toBeInTheDocument()
      })
    })

    it('includes currency selection', async () => {
      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await waitFor(() => {
        // Find by display value 'PLN' which is the default currency
        expect(screen.getByDisplayValue('PLN')).toBeInTheDocument()
      })
    })
  })

  // ==================== APPLICATION LIST Tests ====================

  describe('Application List', () => {
    it('displays applications in Kanban view', async () => {
      vi.mocked(api.fetchApplications).mockResolvedValue([
        { id: 1, company: 'Google', position: 'Dev', status: 'SENT', appliedAt: new Date().toISOString() } as never,
        { id: 2, company: 'Meta', position: 'Engineer', status: 'IN_PROGRESS', appliedAt: new Date().toISOString() } as never
      ])

      renderApp()

      await waitFor(() => {
        expect(screen.getByText('Google')).toBeInTheDocument()
        expect(screen.getByText('Meta')).toBeInTheDocument()
      })
    })

    it('displays Kanban columns', async () => {
      vi.mocked(api.fetchApplications).mockResolvedValue([])

      renderApp()

      await waitFor(() => {
        expect(screen.getByText('Wysłane')).toBeInTheDocument()
        expect(screen.getByText('W procesie')).toBeInTheDocument()
        expect(screen.getByText('Zakończone')).toBeInTheDocument()
      })
    })
  })

  // ==================== ERROR HANDLING Tests ====================

  describe('Error Handling', () => {
    it('handles fetch error — app does not crash', async () => {
      vi.mocked(api.fetchApplications).mockRejectedValue(new Error('Network error'))

      renderApp()

      // App should not crash — header and badge widget still render
      await waitFor(() => {
        expect(screen.getByText(/Twoje odznaki/)).toBeInTheDocument()
      })
    })

    it('handles create error — form stays open', async () => {
      const user = userEvent.setup()

      vi.mocked(api.createApplication).mockRejectedValue(new Error('Create failed'))

      renderApp()

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Dodaj aplikację'))
      })

      await user.type(screen.getByLabelText(/Firma/), 'Test')
      await user.type(screen.getByLabelText(/Stanowisko/), 'Dev')

      fireEvent.click(screen.getByText('Dodaj aplikację'))

      // After create error, the form should remain visible (not closed)
      await waitFor(() => {
        expect(screen.getByText('Dodaj nową aplikację')).toBeInTheDocument()
      })
    })
  })
})
