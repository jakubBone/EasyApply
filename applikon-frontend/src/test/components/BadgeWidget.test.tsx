import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BadgeWidget } from '../../components/badges/BadgeWidget'
import { useBadgeStats } from '../../hooks/useBadgeStats'

vi.mock('../../hooks/useBadgeStats')

const mockStats = (overrides = {}) => ({
  totalRejections: 0,
  totalGhosting: 0,
  totalOffers: 0,
  sweetRevengeUnlocked: false,
  rejectionBadge: { name: null },
  ghostingBadge: { name: null },
  ...overrides,
})

describe('BadgeWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Rendering', () => {
    it('renders nothing when data is missing', () => {
      vi.mocked(useBadgeStats).mockReturnValue({ data: undefined } as never)

      const { container } = render(<BadgeWidget />)

      expect(container.firstChild).toBeNull()
    })

    it('renders header with badge icon', () => {
      vi.mocked(useBadgeStats).mockReturnValue({ data: mockStats() } as never)

      render(<BadgeWidget />)

      expect(screen.getByText(/Twoje odznaki/)).toBeInTheDocument()
    })

    it('is collapsed by default', () => {
      vi.mocked(useBadgeStats).mockReturnValue({ data: mockStats({ totalRejections: 5 }) } as never)

      render(<BadgeWidget />)

      expect(screen.queryByText(/Odrzucone aplikacje/)).not.toBeInTheDocument()
    })

    it('expands on header click', () => {
      vi.mocked(useBadgeStats).mockReturnValue({
        data: mockStats({
          totalRejections: 5,
          rejectionBadge: { name: 'Rękawica', icon: '🥊', threshold: 5 },
        }),
      } as never)

      render(<BadgeWidget />)
      fireEvent.click(screen.getByText(/Twoje odznaki/))

      expect(screen.getByText(/Odrzucone aplikacje/)).toBeInTheDocument()
    })
  })

  describe('Rejection Badges', () => {
    it('displays "Rękawica" at 5 rejections', () => {
      vi.mocked(useBadgeStats).mockReturnValue({
        data: mockStats({
          totalRejections: 5,
          rejectionBadge: {
            name: 'Rękawica',
            icon: '🥊',
            threshold: 5,
            description: 'Dopiero zaczynasz.',
            nextThreshold: 10,
            nextBadgeName: 'Patelnia',
          },
        }),
      } as never)

      render(<BadgeWidget />)
      fireEvent.click(screen.getByText(/Twoje odznaki/))

      expect(screen.getByText('Rękawica')).toBeInTheDocument()
      expect(screen.getByText('🥊')).toBeInTheDocument()
    })

    it('displays next badge to earn', () => {
      vi.mocked(useBadgeStats).mockReturnValue({
        data: mockStats({
          totalRejections: 7,
          rejectionBadge: {
            name: 'Rękawica',
            icon: '🥊',
            threshold: 5,
            description: 'Dopiero zaczynasz.',
            nextThreshold: 10,
            nextBadgeName: 'Patelnia',
          },
        }),
      } as never)

      render(<BadgeWidget />)
      fireEvent.click(screen.getByText(/Twoje odznaki/))

      expect(screen.getByText(/Następny.*Patelnia/)).toBeInTheDocument()
    })

    it('shows MAX when highest badge is reached', () => {
      vi.mocked(useBadgeStats).mockReturnValue({
        data: mockStats({
          totalRejections: 100,
          rejectionBadge: {
            name: 'Statystyczna Pewność',
            icon: '🎰',
            threshold: 100,
            description: 'Przy takiej próbie, kolejna MUSI być ta właściwa.',
            nextThreshold: null,
            nextBadgeName: null,
          },
        }),
      } as never)

      render(<BadgeWidget />)
      fireEvent.click(screen.getByText(/Twoje odznaki/))

      expect(screen.getByText('MAX')).toBeInTheDocument()
    })
  })

  describe('Ghosting Badges', () => {
    it('displays "Widmo" at 5 ghostings', () => {
      vi.mocked(useBadgeStats).mockReturnValue({
        data: mockStats({
          totalRejections: 5,
          totalGhosting: 5,
          rejectionBadge: { name: 'Rękawica', icon: '🥊', threshold: 5 },
          ghostingBadge: {
            name: 'Widmo',
            icon: '👻',
            threshold: 5,
            description: '5 firm nie odpowiedziało wcale.',
            nextThreshold: 15,
            nextBadgeName: 'Cierpliwy Mnich',
          },
        }),
      } as never)

      render(<BadgeWidget />)
      fireEvent.click(screen.getByText(/Twoje odznaki/))

      expect(screen.getByText('Widmo')).toBeInTheDocument()
    })

    it('displays ghosting count', () => {
      vi.mocked(useBadgeStats).mockReturnValue({
        data: mockStats({
          totalRejections: 10,
          totalGhosting: 8,
          rejectionBadge: { name: 'Patelnia', icon: '🍳', threshold: 10 },
          ghostingBadge: { name: 'Widmo', icon: '👻', threshold: 5 },
        }),
      } as never)

      render(<BadgeWidget />)
      fireEvent.click(screen.getByText(/Twoje odznaki/))

      expect(screen.getByText(/Bez odzewu.*8/)).toBeInTheDocument()
    })
  })

  describe('Sweet Revenge', () => {
    it('displays Sweet Revenge when unlocked', () => {
      vi.mocked(useBadgeStats).mockReturnValue({
        data: mockStats({
          totalRejections: 15,
          totalGhosting: 5,
          totalOffers: 2,
          sweetRevengeUnlocked: true,
          rejectionBadge: { name: 'Patelnia', icon: '🍳', threshold: 10 },
          ghostingBadge: { name: 'Widmo', icon: '👻', threshold: 5 },
        }),
      } as never)

      render(<BadgeWidget />)
      fireEvent.click(screen.getByText(/Twoje odznaki/))

      expect(screen.getByText('Sweet Revenge')).toBeInTheDocument()
      expect(screen.getByText(/Kto się śmieje ostatni/)).toBeInTheDocument()
    })

    it('does not display Sweet Revenge when locked', () => {
      vi.mocked(useBadgeStats).mockReturnValue({
        data: mockStats({
          totalRejections: 5,
          totalOffers: 1,
          sweetRevengeUnlocked: false,
          rejectionBadge: { name: 'Rękawica', icon: '🥊', threshold: 5 },
        }),
      } as never)

      render(<BadgeWidget />)
      fireEvent.click(screen.getByText(/Twoje odznaki/))

      expect(screen.queryByText('Sweet Revenge')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('renders nothing when hook returns no data', () => {
      vi.mocked(useBadgeStats).mockReturnValue({ data: undefined, error: new Error('API Error') } as never)

      const { container } = render(<BadgeWidget />)

      expect(container.firstChild).toBeNull()
    })
  })
})
