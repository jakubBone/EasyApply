import { useState } from 'react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useApplicationScreeningAnswers, useSaveApplicationScreeningAnswers } from '../../hooks/useScreeningAnswers'
import { useBrief, useEditBrief } from '../../hooks/useBrief'
import { FIXED_COMPANY_KEY } from './globalAnswers'
import { BRIEF_FIELD_KEYS } from '../../types/domain'
import type {
  Application,
  BriefFieldEdit,
  BriefResponse,
  ScreeningAnswer,
  ScreeningAnswerRequest,
} from '../../types/domain'
import './prep.css'

const MAX_ANSWER = 1000
// Matches BriefEditRequest.Field's @Size(max = 4000)
const MAX_BRIEF = 4000

interface Item {
  label: string | null
  answer: string
  custom: boolean
}

// Merge the saved per-application answers into the fixed "What do you know about us?"
//  question followed by any custom questions.
function buildItems(answers: ScreeningAnswer[]): Item[] {
  const fixed = answers.find(a => !a.custom && a.questionKey === FIXED_COMPANY_KEY)
  const custom = answers
    .filter(a => a.custom)
    .map(a => ({ label: a.label ?? '', answer: a.answer, custom: true }))
  return [{ label: null, answer: fixed?.answer ?? '', custom: false }, ...custom]
}

const toRequest = (items: Item[]): ScreeningAnswerRequest[] =>
  items.map(it =>
    it.custom
      ? { questionKey: null, label: it.label, answer: it.answer, custom: true }
      : { questionKey: FIXED_COMPANY_KEY, label: null, answer: it.answer, custom: false },
  )

// The brief's texts in the current app language, keyed by field: the editor's starting point.
function buildBriefTexts(brief: BriefResponse | null | undefined, lang: string): Record<string, string> {
  const texts: Record<string, string> = {}
  if (brief?.status !== 'READY') return texts
  for (const key of BRIEF_FIELD_KEYS) {
    texts[key] = brief.fields.find(f => f.key === key)?.texts[lang] ?? ''
  }
  return texts
}

// Modal editor for the per-application "About the company" prep, with the same layout as
// the global answers modal (fixed question + add/remove custom questions), saved as a
// replace-all set of per-application screening answers. A generated brief adds its four
// fields on top; those save to the company's brief, not to this application.
export function CompanyQuestionsModal({ application, onClose }: { application: Application; onClose: () => void }) {
  const { data, isLoading } = useApplicationScreeningAnswers(application.id)
  const { data: brief, isLoading: briefLoading } = useBrief(application.id)
  // Seed the editor only once the saved set is loaded, so custom questions are not lost.
  if (isLoading || briefLoading) return <div className="prep-modal-overlay" onClick={onClose} />
  return (
    <CompanyQuestionsEditor
      applicationId={application.id}
      initial={data ?? []}
      brief={brief ?? null}
      onClose={onClose}
    />
  )
}

function CompanyQuestionsEditor({
  applicationId,
  initial,
  brief,
  onClose,
}: {
  applicationId: number
  initial: ScreeningAnswer[]
  brief: BriefResponse | null
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.split('-')[0]
  const { mutate, isPending } = useSaveApplicationScreeningAnswers(applicationId)
  const { mutate: saveBrief, isPending: savingBrief } = useEditBrief(applicationId)
  const [items, setItems] = useState<Item[]>(() => buildItems(initial))
  const [briefTexts, setBriefTexts] = useState<Record<string, string>>(() => buildBriefTexts(brief, lang))
  // The untouched starting point. Only fields the user actually changed are sent, so a
  // generated field is never flagged as the user's own text (it would enter the GDPR export).
  const [initialBriefTexts] = useState(() => buildBriefTexts(brief, lang))
  const showBrief = brief?.status === 'READY'
  // Same rule as the read-only rows: a ready brief makes an unanswered "What do you know
  // about us?" dead weight. Frozen at open, so the field cannot vanish from under the cursor
  // when the last character is deleted. Clearing it hides the field on the next open. It
  // stays in `items` either way, so saving never drops the stored row.
  const [showFixedQuestion] = useState(
    () => buildItems(initial)[0].answer.trim() !== '' || brief?.status !== 'READY',
  )

  const setAnswer = (index: number, value: string) =>
    setItems(items.map((it, i) => (i === index ? { ...it, answer: value } : it)))
  const setLabel = (index: number, value: string) =>
    setItems(items.map((it, i) => (i === index ? { ...it, label: value } : it)))
  const addCustom = () => setItems([...items, { label: '', answer: '', custom: true }])
  const removeCustom = (index: number) => setItems(items.filter((_, i) => i !== index))

  const changedBriefFields = (): BriefFieldEdit[] =>
    BRIEF_FIELD_KEYS.filter(key => briefTexts[key] !== initialBriefTexts[key]).map(key => ({
      fieldKey: key,
      text: briefTexts[key],
    }))

  // Brief edits go to the company's brief, the answers to this application. Save both,
  // and close only once the answers land.
  const save = () => {
    const briefEdits = showBrief ? changedBriefFields() : []
    const saveAnswers = () => mutate(toRequest(items), { onSuccess: onClose })
    if (briefEdits.length > 0) saveBrief(briefEdits, { onSuccess: saveAnswers })
    else saveAnswers()
  }

  return (
    <div className="prep-modal-overlay" onClick={onClose}>
      <div className="prep-modal" data-cy="company-questions-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="prep-modal-head">
          <h2>{t('cheatSheet.editCompanyTitle')}</h2>
          <button className="prep-modal-close" onClick={onClose} aria-label={t('app.close')}>×</button>
        </div>
        <div className="prep-modal-body">
          {showBrief && BRIEF_FIELD_KEYS.map(key => (
            <div className="prep-field" key={`brief-${key}`}>
              <div className="prep-field-head">
                <span className="prep-field-label">✨ {t(`brief.fields.${key}` as unknown as ParseKeys)}</span>
              </div>
              <textarea
                className="prep-textarea"
                data-cy={`brief-edit-${key}`}
                value={briefTexts[key] ?? ''}
                maxLength={MAX_BRIEF}
                placeholder={t('brief.insufficient')}
                onChange={e => setBriefTexts({ ...briefTexts, [key]: e.target.value })}
              />
            </div>
          ))}
          {items.map((item, index) => !item.custom && !showFixedQuestion ? null : (
            <div className="prep-field" key={item.custom ? `custom-${index}` : 'fixed'}>
              <div className="prep-field-head">
                {item.custom ? (
                  <input
                    className="prep-label-input"
                    type="text"
                    value={item.label ?? ''}
                    placeholder={t('answers.customLabelPlaceholder')}
                    onChange={e => setLabel(index, e.target.value)}
                  />
                ) : (
                  <span className="prep-field-label">{t('cheatSheet.companyLabel')}</span>
                )}
                {item.custom && (
                  <button className="prep-remove-btn" onClick={() => removeCustom(index)} aria-label={t('answers.removeCustom')}>
                    ✕
                  </button>
                )}
              </div>
              <textarea
                className="prep-textarea"
                value={item.answer}
                maxLength={MAX_ANSWER}
                placeholder={t('answers.answerPlaceholder')}
                onChange={e => setAnswer(index, e.target.value)}
              />
              <div className="prep-counter">{item.answer.length}/{MAX_ANSWER}</div>
            </div>
          ))}
          <button className="prep-add-btn" data-cy="prep-add" onClick={addCustom}>+ {t('answers.addCustom')}</button>
        </div>
        <div className="prep-modal-actions">
          <button className="prep-modal-btn cancel" onClick={onClose}>{t('notes.cancel')}</button>
          <button className="prep-modal-btn save" data-cy="prep-save" onClick={save} disabled={isPending || savingBrief}>{t('notes.save')}</button>
        </div>
      </div>
    </div>
  )
}

export default CompanyQuestionsModal
