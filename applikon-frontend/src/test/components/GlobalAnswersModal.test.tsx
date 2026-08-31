import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '../../i18n'
import { GlobalAnswersModal } from '../../components/prep/GlobalAnswersModal'
import { buildItems, toRequest, labelFor, FIXED_QUESTION_KEYS } from '../../components/prep/globalAnswers'
import { useScreeningAnswers, useSaveScreeningAnswers } from '../../hooks/useScreeningAnswers'
import type { ScreeningAnswer } from '../../types/domain'

vi.mock('../../hooks/useScreeningAnswers')

beforeAll(async () => { await i18n.changeLanguage('en') })
afterAll(async () => { await i18n.changeLanguage('pl') })

const save = vi.fn()
const answer = (o: Partial<ScreeningAnswer>): ScreeningAnswer =>
  ({ id: 1, questionKey: null, label: null, answer: '', custom: false, sortOrder: 0, ...o })

describe('globalAnswers helpers', () => {
  it('seeds the built-in template only when nothing is saved yet', () => {
    const seeded = buildItems([], FIXED_QUESTION_KEYS)
    expect(seeded.map(i => i.questionKey)).toEqual(['about-me', 'why-changing'])
    expect(seeded.every(i => !i.custom && i.answer === '')).toBe(true)
  })

  it('returns the saved set as-is, so a deleted built-in question stays gone', () => {
    const saved = [answer({ questionKey: 'why-changing', answer: 'Growth' })]
    expect(buildItems(saved, FIXED_QUESTION_KEYS)).toEqual([
      { questionKey: 'why-changing', label: null, answer: 'Growth', custom: false },
    ])
  })

  it('round-trips items through toRequest', () => {
    const items = buildItems([answer({ questionKey: 'about-me', answer: 'Hi' })], FIXED_QUESTION_KEYS)
    expect(toRequest(items)).toEqual([
      { questionKey: 'about-me', label: null, answer: 'Hi', custom: false },
    ])
  })

  it('labels built-in rows from i18n and custom rows from their own text', () => {
    expect(labelFor({ questionKey: 'about-me', label: null, answer: '', custom: false }, i18n.t)).toBe(
      'Tell us about yourself',
    )
    expect(labelFor({ questionKey: null, label: 'My stack', answer: '', custom: true }, i18n.t)).toBe('My stack')
  })
})

describe('GlobalAnswersModal — every row removable', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useSaveScreeningAnswers).mockReturnValue({ mutate: save, isPending: false } as never)
  })

  it('shows a remove button on the built-in rows, not just custom ones', () => {
    vi.mocked(useScreeningAnswers).mockReturnValue({ data: [] } as never)
    render(<GlobalAnswersModal onClose={vi.fn()} />)
    // Two built-in rows, each with its own ✕.
    expect(screen.getAllByRole('button', { name: 'Remove question' })).toHaveLength(2)
  })

  it('drops an empty built-in row without confirming', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    vi.mocked(useScreeningAnswers).mockReturnValue({ data: [] } as never)
    render(<GlobalAnswersModal onClose={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove question' })[0])
    fireEvent.click(screen.getByText('Save'))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(save.mock.calls[0][0].map((r: { questionKey: string | null }) => r.questionKey)).toEqual(['why-changing'])
    confirmSpy.mockRestore()
  })

  it('confirms before dropping an answered row, and cancelling keeps it', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(useScreeningAnswers).mockReturnValue({
      data: [
        { id: 1, questionKey: 'about-me', label: null, answer: 'A while ago', custom: false, sortOrder: 0 },
        { id: 2, questionKey: 'why-changing', label: null, answer: '', custom: false, sortOrder: 1 },
      ],
    } as never)
    render(<GlobalAnswersModal onClose={vi.fn()} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove question' })[0])
    expect(confirmSpy).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Save'))
    expect(save.mock.calls[0][0].map((r: { questionKey: string | null }) => r.questionKey)).toEqual([
      'about-me',
      'why-changing',
    ])
    confirmSpy.mockRestore()
  })

  it('lets the user remove every row and save an empty set', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(useScreeningAnswers).mockReturnValue({ data: [] } as never)
    render(<GlobalAnswersModal onClose={vi.fn()} />)

    let buttons = screen.queryAllByRole('button', { name: 'Remove question' })
    while (buttons.length > 0) {
      fireEvent.click(buttons[0])
      buttons = screen.queryAllByRole('button', { name: 'Remove question' })
    }
    fireEvent.click(screen.getByText('Save'))

    expect(save.mock.calls[0][0]).toEqual([])
    confirmSpy.mockRestore()
  })
})
