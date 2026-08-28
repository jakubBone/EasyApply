import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrivacyPolicy } from '../../pages/PrivacyPolicy'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

vi.mock('../../content/privacyPolicy', () => ({
  privacyPolicyPl: `
# Polityka prywatności Applikon

## 1. Kim jestem?

Administratorem Twoich danych osobowych w aplikacji **Applikon** jest Jakub Boniecki.

## 2. Jakie dane zbieram?

Zbieram minimalny zakres danych:
- Email
- Imię i nazwisko
- Dane o aplikacjach o pracę

**Czego NIE zbieram:**
- Plików CV
- Danych o lokalizacji
`,
  privacyPolicyEn: `
# Applikon Privacy Policy

## 1. Who am I?

The data controller for your personal data in the **Applikon** application is Jakub Boniecki.

## 2. What data do I collect?

I collect the minimum data necessary:
- Email address
- Name
- Job application data

**What I do NOT collect:**
- CV files
- Location data
`,
}))

describe('PrivacyPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders privacy policy page', () => {
    render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>)

    expect(screen.getByText(/Applikon Privacy Policy/)).toBeInTheDocument()
  })

  it('displays main headings', () => {
    render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>)

    expect(screen.getByText(/Who am I/)).toBeInTheDocument()
    expect(screen.getByText(/What data do I collect/)).toBeInTheDocument()
  })

  it('displays content with proper formatting', () => {
    render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>)

    expect(screen.getByText(/Jakub Boniecki/)).toBeInTheDocument()
    expect(screen.getByText(/Email address/)).toBeInTheDocument()
  })

  it('renders lists', () => {
    render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>)

    const listItems = screen.getAllByRole('listitem')
    expect(listItems.length).toBeGreaterThan(0)
  })

  it('applies proper CSS classes', () => {
    const { container } = render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>)

    expect(container.querySelector('.privacy-policy-page')).toBeInTheDocument()
    expect(container.querySelector('.privacy-container')).toBeInTheDocument()
    expect(container.querySelector('.privacy-content')).toBeInTheDocument()
  })

  it('renders with markdown formatting (headings)', () => {
    render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>)

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/Applikon Privacy Policy/)

    const h2Elements = screen.getAllByRole('heading', { level: 2 })
    expect(h2Elements.length).toBeGreaterThan(0)
  })

  it('does NOT display raw markdown syntax', () => {
    render(<MemoryRouter><PrivacyPolicy /></MemoryRouter>)

    expect(screen.queryByText(/^#/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument()
  })
})
