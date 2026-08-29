import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '../../i18n'
import { CheatSheet } from '../../components/cheatsheet/CheatSheet'
import {
  useScreeningAnswers,
  useSaveScreeningAnswers,
  useApplicationScreeningAnswers,
  useSaveApplicationScreeningAnswers,
} from '../../hooks/useScreeningAnswers'
import { useBrief, useGenerateBrief, useEditBrief, useDeleteBrief } from '../../hooks/useBrief'
import type { Application } from '../../types/domain'

vi.mock('../../hooks/useScreeningAnswers')
// The company section also reads the AI brief; this spec is about the prep hub, so it
// runs with no brief. The brief's own behaviour is covered by BriefSection.test.tsx.
vi.mock('../../hooks/useBrief')
// The app form is heavy and only used for salary editing, so stub it out here.
vi.mock('../../components/applications/ApplicationForm', () => ({
  ApplicationForm: () => <div data-testid="app-form" />,
}))

// Assert on the English UI so this spec stays in the repo language and does not
// couple to the Polish translations. (The rest of the suite runs in 'pl'.)
beforeAll(async () => { await i18n.changeLanguage('en') })
afterAll(async () => { await i18n.changeLanguage('pl') })

const makeApp = (o: Partial<Application> = {}): Application =>
  ({
    id: 1,
    company: 'Acme',
    position: 'Java Developer',
    status: 'SENT',
    appliedAt: new Date().toISOString(),
    currentStage: null,
    rejectionReason: null,
    salary: 12000,
    currency: 'PLN',
    ...o,
  }) as Application

describe('CheatSheet hub', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useScreeningAnswers).mockReturnValue({ data: [] } as never)
    vi.mocked(useSaveScreeningAnswers).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useApplicationScreeningAnswers).mockReturnValue({ data: [], isLoading: false } as never)
    vi.mocked(useSaveApplicationScreeningAnswers).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useBrief).mockReturnValue({ data: null, isLoading: false } as never)
    vi.mocked(useGenerateBrief).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useEditBrief).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useDeleteBrief).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
  })

  it('shows a hint when there are no applications', () => {
    render(<CheatSheet applications={[]} />)
    expect(screen.getByText(/Add an application first/)).toBeInTheDocument()
  })

  it('reveals the "About the company" block when expanded', () => {
    vi.mocked(useApplicationScreeningAnswers).mockReturnValue({
      data: [{ id: 1, questionKey: null, label: 'Their office', answer: 'Fintech, 200 people', custom: true, sortOrder: 0 }],
      isLoading: false,
    } as never)
    render(<CheatSheet applications={[makeApp()]} />)
    // Bars are collapsed by default, so content is hidden until the user opens them.
    expect(screen.queryByText('Your salary')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /About the company/ }))
    expect(screen.getByText('Your salary')).toBeInTheDocument()
    expect(screen.getByText(/Fintech, 200 people/)).toBeInTheDocument()
  })

  it('reveals the "General" block with the fixed questions when expanded', () => {
    render(<CheatSheet applications={[makeApp()]} />)
    fireEvent.click(screen.getByRole('button', { name: /General/ }))
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument()
  })

  it('opens the general-answers editor (modal, not inline)', () => {
    render(<CheatSheet applications={[makeApp()]} />)
    const editButtons = screen.getAllByRole('button', { name: 'Add/Edit' })
    fireEvent.click(editButtons[editButtons.length - 1]) // the "General" section edit
    expect(screen.getByText('General questions')).toBeInTheDocument()
  })

  it('opens the "About the company" editor with add-question (like General)', () => {
    render(<CheatSheet applications={[makeApp()]} />)
    const editButtons = screen.getAllByRole('button', { name: 'Add/Edit' })
    fireEvent.click(editButtons[0]) // the "About the company" section edit
    expect(screen.getByText('Company questions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add question/ })).toBeInTheDocument()
  })
})
