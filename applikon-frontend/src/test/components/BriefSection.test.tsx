import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import i18n from '../../i18n'
import { CheatSheet } from '../../components/cheatsheet/CheatSheet'
import { useBrief, useGenerateBrief, useEditBrief, useDeleteBrief } from '../../hooks/useBrief'
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
    { key: 'pitch', texts: { en: 'B2B payments company on Java and Kafka', pl: 'Firma płatności B2B na Javie i Kafce' }, edited: false },
  ],
}

const generate = vi.fn()
const editBrief = vi.fn()
const deleteBrief = vi.fn()

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
    vi.mocked(useDeleteBrief).mockReturnValue({ mutate: deleteBrief, isPending: false } as never)
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

  it('renders one labeled pitch block when READY, with no regenerate control', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    expect(screen.queryByRole('button', { name: /Generate brief/ })).not.toBeInTheDocument()
    openCompanySection()
    expect(screen.getByText(/What do you know about the company/)).toBeInTheDocument()
    expect(screen.getByText('B2B payments company on Java and Kafka')).toBeInTheDocument()
  })

  it('clamps the pitch and expands it on the toggle', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    const pitch = screen.getByText('B2B payments company on Java and Kafka')
    expect(pitch).not.toHaveClass('expanded')
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(pitch).toHaveClass('expanded')
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }))
    expect(pitch).not.toHaveClass('expanded')
  })

  it('marks a pitch without public data instead of hiding it', () => {
    withBrief({ status: 'READY', fields: [{ key: 'pitch', texts: { en: null, pl: null }, edited: false }] })
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.getByText('Not enough public info')).toBeInTheDocument()
  })

  it('reads a cleared pitch as an empty answer, not as missing public data', () => {
    withBrief({ status: 'READY', fields: [{ key: 'pitch', texts: { en: '', pl: '' }, edited: true }] })
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.queryByText('Not enough public info')).not.toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('follows the app language', async () => {
    withBrief(readyBrief)
    const view = render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.getByText('B2B payments company on Java and Kafka')).toBeInTheDocument()

    await act(async () => { await i18n.changeLanguage('pl') })
    view.rerender(<CheatSheet applications={[app]} />)
    expect(screen.getByText('Firma płatności B2B na Javie i Kafce')).toBeInTheDocument()
    expect(screen.queryByText('B2B payments company on Java and Kafka')).not.toBeInTheDocument()
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

  it('saves the pitch only when the user actually changed it', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])

    fireEvent.change(screen.getByDisplayValue('B2B payments company on Java and Kafka'), {
      target: { value: 'B2B payments, lending too' },
    })
    fireEvent.click(screen.getByText('Save'))

    expect(editBrief).toHaveBeenCalledTimes(1)
    expect(editBrief.mock.calls[0][0]).toEqual([{ fieldKey: 'pitch', text: 'B2B payments, lending too' }])
  })

  it('does not touch the brief when only the answers were edited', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])
    fireEvent.click(screen.getByText('Save'))
    expect(editBrief).not.toHaveBeenCalled()
  })

  it('deletes the brief from the editor once confirmed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Delete brief' }))
    expect(deleteBrief).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })

  it('deletes nothing when the delete is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Delete brief' }))
    expect(deleteBrief).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('has no built-in "What do you know about us?" row in the read view or the editor', () => {
    withBrief(readyBrief)
    render(<CheatSheet applications={[app]} />)
    openCompanySection()
    expect(screen.queryByText('What do you know about us?')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])
    expect(screen.queryByText('What do you know about us?')).not.toBeInTheDocument()
    // The pitch itself is still editable there.
    expect(screen.getByDisplayValue('B2B payments company on Java and Kafka')).toBeInTheDocument()
  })

  it('shows no pitch editor before a brief exists', () => {
    render(<CheatSheet applications={[app]} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Add/Edit' })[0])
    expect(screen.queryByText('What do you know about the company')).not.toBeInTheDocument()
  })
})
