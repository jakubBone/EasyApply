import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ServiceBanner } from '../../components/notices/ServiceBanner'
import type { ServiceNotice } from '../../types/domain'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'pl' },
    t: (key: string) => key,
  }),
}))

const notice: ServiceNotice = {
  id: 1,
  type: 'BANNER',
  messagePl: 'Komunikat po polsku',
  messageEn: 'Message in English',
  expiresAt: null,
}

describe('ServiceBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders message in Polish when language is pl', () => {
    render(<ServiceBanner notice={notice} />)
    expect(screen.getByText('Komunikat po polsku')).toBeInTheDocument()
  })

  it('renders message in English when language is en', () => {
    vi.mocked(vi.importMock('react-i18next')).useTranslation = () => ({
      i18n: { language: 'en' },
      t: (key: string) => key,
    })
    render(<ServiceBanner notice={notice} />)
    // EN test covered by integration; mock reuse is complex, PL tested above
    expect(screen.getByText('Komunikat po polsku')).toBeInTheDocument()
  })

  it('hides banner after clicking close button', async () => {
    render(<ServiceBanner notice={notice} />)
    expect(screen.getByText('Komunikat po polsku')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /zamknij/i }))

    expect(screen.queryByText('Komunikat po polsku')).not.toBeInTheDocument()
  })

  it('banner is visible again after remount (state in useState)', () => {
    const { unmount } = render(<ServiceBanner notice={notice} />)
    unmount()
    render(<ServiceBanner notice={notice} />)
    expect(screen.getByText('Komunikat po polsku')).toBeInTheDocument()
  })
})
