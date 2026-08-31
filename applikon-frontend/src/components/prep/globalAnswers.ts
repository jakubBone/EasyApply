import type { ParseKeys, TFunction } from 'i18next'
import type { ScreeningAnswer, ScreeningAnswerRequest } from '../../types/domain'

// Built-in "General" questions with stable keys; labels come from i18n
// (answers.questions.<key>). "About the company" has no built-in question — the generated
// pitch already is that answer.
export const FIXED_QUESTION_KEYS = [
  'about-me',
  'why-changing',
] as const

export const MAX_ANSWER_LENGTH = 1000

// Editable row, mirroring the wire shape minus server-assigned fields.
export interface Item {
  questionKey: string | null
  label: string | null
  answer: string
  custom: boolean
}

const toItem = (a: ScreeningAnswer): Item =>
  a.custom
    ? { questionKey: null, label: a.label ?? '', answer: a.answer, custom: true }
    : { questionKey: a.questionKey, label: null, answer: a.answer, custom: false }

// The saved set is authoritative once anything is stored: it comes back as-is, so a deleted
// built-in question stays deleted. `template` seeds a section that was never saved (empty
// server set) with its built-in questions. GlobalAnswersModal passes FIXED_QUESTION_KEYS;
// CompanyQuestionsModal passes [] — it has no built-in question of its own.
export function buildItems(server: ScreeningAnswer[], template: readonly string[]): Item[] {
  if (server.length > 0) return server.map(toItem)
  return template.map(key => ({ questionKey: key, label: null, answer: '', custom: false }))
}

export const toRequest = (items: Item[]): ScreeningAnswerRequest[] =>
  items.map(i => ({ questionKey: i.questionKey, label: i.label, answer: i.answer, custom: i.custom }))

// The shown label for a row: the typed custom label, or the i18n text for a built-in question.
export const labelFor = (item: Item, t: TFunction): string =>
  item.custom ? item.label ?? '' : t(`answers.questions.${item.questionKey}` as unknown as ParseKeys)
