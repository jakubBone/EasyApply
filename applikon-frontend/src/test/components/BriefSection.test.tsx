import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import i18n from '../../i18n'
import { CheatSheet } from '../../components/cheatsheet/CheatSheet'
import { useBrief, useGenerateBrief, useEditBrief } from '../../hooks/useBrief'
import {
  useScreeningAnswers,
  useSaveScreeningAnswers,
  useApplicationScreeningAnswers,
  useSaveApplicationScreeningAnswers,
} from '../../hooks/useScreeningAnswers'
import type { Application, BriefResponse } from '../../types/domain'

vi.mock('../../hooks/useScreeningAnswers')
vi.mock('../../hooks/useBrief')

// Assert on the English UI so this spec stays in the repo language, except where the
// language switch itself is under test. (The rest of the suite runs in 'pl'.)
beforeAll(async () => { await i18n.changeLanguage('en') })
afterAll(async () => { await i18n.changeLanguage('pl') })

const app: Application = {
  id: 1,
  company: 'Acme',
  position: 'Java Developer',
  status: 'SENT',
  appliedAt: new Date().toISOString(),
  currentStage: null,
  rejectionReason: null,
  salary: 12000,
  currency: 'PLN',
} as Application

const readyBrief: BriefResponse = {
  status: 'READY',
  fields: [
    { key: 'industry', texts: { en: 'Fintech', pl: 'Fintech PL' }, edited: false },
    { key: 'product_customers', texts: { en: 'B2B payments', pl: 'Płatności B2B' }, edited: false },
    { key: 'tech_stack', texts: { en: 'Java, Kafka', pl: 'Java, Kafka' }, edited: false },
    { key: 'size_stage', texts: { en: null, pl: null }, edited: false },
  ],
}

const generate = vi.fn()
const editBrief = vi.fn()

// Point the mocked useBrief at a given brief (null = never generated).
const withBrief = (brief: BriefResponse | null) =>
  vi.mocked(useBrief).mockReturnValue({ data: brief, isLoading: false } as never)

// Open the "About the company" section. Everything but the header button is collapsed.
const openCompanySection = () =>
  fireEvent.click(screen.getByRole('button', { name: /About the company/ }))

describe('Company brief in the "About the company" section', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useScreeningAnswers).mockReturnValue({ data: [] } as never)
    vi.mocked(useSaveScreeningAnswers).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useApplicationScreeningAnswers).mockReturnValue({ data: [], isLoading: false } as never)
    vi.mocked(useSaveApplicationScreeningAnswers).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useGenerateBrief).mockReturnValue({ mutate: generate, isPending: false } as never)
    vi.mocked(useEditBrief).mockReturnValue({ mutate: editBrief, isPending: false } as never)
    withBrief(null)
  })

  it('offers the generate button on an application without a brief', () => {
    render(<CheatSheet applications={[app]} />)
    expect(screen.getByRole('button', { name: /Generate brief/ })).toBeInTheDocument()
  })

  it('triggers generation on click', () => {
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getByRole('button', { name: /Generate brief/ }))
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('shows the generating state while PENDING', () => {
    withBrief({ status: 'PENDING', fields: [] })
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.getByText(/Generating the brief/)).toBeInTheDocument()
  })

  it('renders the four fields when READY, with no regenerate control', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    expect(screen.queryByRole('button', { name: /Generate brief/ })).not.toBeInTheDocument()
    openCompanySection()
    expect(screen.getByText('Fintech')).toBeInTheDocument()
    expect(screen.getByText('B2B payments')).toBeInTheDocument()
    expect(screen.getByText('Java, Kafka')).toBeInTheDocument()
    expect(screen.getByText(/Size \/ stage/)).toBeInTheDocument()
  })

  it('marks a field without public data instead of hiding it', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.getByText('Not enough public info')).toBeInTheDocument()
  })

  it('follows the app language', async () => {
    withBrief(readyBrief)
    const view = render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.getByText('B2B payments')).toBeInTheDocument()

    await act(async () => { await i18n.changeLanguage('pl') })
    view.rerender(<CheatSheet applications={[app]} />)
    expect(screen.getByText('Płatności B2B')).toBeInTheDocument()
    expect(screen.queryByText('B2B payments')).not.toBeInTheDocument()
    await act(async () => { await i18n.changeLanguage('en') })
  })

  it('offers a retry after a failure, and retrying re-triggers generation', () => {
    withBrief({ status: 'FAILED', fields: [] })
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.getByText(/Could not generate the brief/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('saves only the brief fields the user actually changed', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])

    fireEvent.change(screen.getByDisplayValue('Fintech'), { target: { value: 'Fintech, lending' } })
    fireEvent.click(screen.getByText('Save'))

    expect(editBrief).toHaveBeenCalledTimes(1)
    expect(editBrief.mock.calls[0][0]).toEqual([{ fieldKey: 'industry', text: 'Fintech, lending' }])
  })

  it('does not touch the brief when only the answers were edited', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])
    fireEvent.click(screen.getByText('Save'))
    expect(editBrief).not.toHaveBeenCalled()
  })

  it('reads a cleared field as an empty answer, not as missing public data', () => {
    withBrief({
      status: 'READY',
      fields: [
        { key: 'industry', texts: { en: '', pl: '' }, edited: true },
        { key: 'product_customers', texts: { en: null, pl: null }, edited: false },
        { key: 'tech_stack', texts: { en: 'Java', pl: 'Java' }, edited: false },
        { key: 'size_stage', texts: { en: 'Scale-up', pl: 'Scale-up' }, edited: false },
      ],
    })
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    // Only the untouched empty field may claim nothing was found.
    expect(screen.getAllByText('Not enough public info')).toHaveLength(1)
  })

  it('hides the unanswered "What do you know about us?" row once a brief is ready', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.queryByText('What do you know about us?')).not.toBeInTheDocument()
  })

  it('keeps that row when the user wrote their own answer there', () => {
    vi.mocked(useApplicationScreeningAnswers).mockReturnValue({
      data: [{ id: 1, questionKey: 'company-knowledge', label: null, answer: 'Met them at a meetup', custom: false, sortOrder: 0 }],
      isLoading: false,
    } as never)
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.getByText('What do you know about us?')).toBeInTheDocument()
    expect(screen.getByText('Met them at a meetup')).toBeInTheDocument()
  })

  it('keeps that row while no brief is ready yet', () => {
    withBrief({ status: 'PENDING', fields: [] })
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.getByText('What do you know about us?')).toBeInTheDocument()
  })

  it('drops the unanswered fixed question from the editor once a brief is ready', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])
    expect(screen.queryByText('What do you know about us?')).not.toBeInTheDocument()
    // The brief's own fields are still editable there.
    expect(screen.getByDisplayValue('Fintech')).toBeInTheDocument()
  })

  it('shows no brief fields in the editor before a brief exists', () => {
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])
    expect(screen.queryByText(/Tech stack/)).not.toBeInTheDocument()
  })
})
