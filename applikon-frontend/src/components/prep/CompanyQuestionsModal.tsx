import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApplicationScreeningAnswers, useSaveApplicationScreeningAnswers } from '../../hooks/useScreeningAnswers'
import { useBrief, useDeleteBrief, useEditBrief } from '../../hooks/useBrief'
import { BRIEF_PITCH_KEY } from '../../types/domain'
import type {
  Application,
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
}

// The per-application "About the company" prep is now custom questions only — the generated
//  pitch covers "what do you know about the company", so there is no built-in question here.
function buildItems(answers: ScreeningAnswer[]): Item[] {
  return answers.filter(a => a.custom).map(a => ({ label: a.label ?? '', answer: a.answer }))
}

const toRequest = (items: Item[]): ScreeningAnswerRequest[] =>
  items.map(it => ({ questionKey: null, label: it.label, answer: it.answer, custom: true }))

// The pitch text in the current app language: the editor's starting point.
function pitchTextOf(brief: BriefResponse | null | undefined, lang: string): string {
  if (brief?.status !== 'READY') return ''
  return brief.fields.find(f => f.key === BRIEF_PITCH_KEY)?.texts[lang] ?? ''
}

// Modal editor for the per-application "About the company" prep: the generated pitch (with
// its own delete) on top, then add/remove custom questions, saved as a replace-all set of
// per-application screening answers. Pitch edits save to the company's brief, not to this
// application.
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
  const { t: tErrors } = useTranslation('errors')
  const lang = i18n.language.split('-')[0]
  const { mutate, isPending } = useSaveApplicationScreeningAnswers(applicationId)
  const { mutate: saveBrief, isPending: savingBrief } = useEditBrief(applicationId)
  const { mutate: removeBrief, isPending: removingBrief } = useDeleteBrief(applicationId)
  const [items, setItems] = useState<Item[]>(() => buildItems(initial))
  const [pitchText, setPitchText] = useState(() => pitchTextOf(brief, lang))
  // The untouched starting point. Only sent when the user actually changed it, so a generated
  // pitch is never flagged as the user's own text (it would enter the GDPR export).
  const [initialPitch] = useState(() => pitchTextOf(brief, lang))
  const showBrief = brief?.status === 'READY'
  const pitchEdited = brief?.fields.find(f => f.key === BRIEF_PITCH_KEY)?.edited ?? false

  const setAnswer = (index: number, value: string) =>
    setItems(items.map((it, i) => (i === index ? { ...it, answer: value } : it)))
  const setLabel = (index: number, value: string) =>
    setItems(items.map((it, i) => (i === index ? { ...it, label: value } : it)))
  const addCustom = () => setItems([...items, { label: '', answer: '' }])
  const removeCustom = (index: number) => setItems(items.filter((_, i) => i !== index))

  // The brief is shared by every application to this company; warn harder when the user's own
  // edit is about to go. Deleting closes the editor — the read view falls back to "Generate".
  const deletePitch = () => {
    const msg = tErrors(pitchEdited ? 'brief.deleteConfirmEdited' : 'brief.deleteConfirm')
    if (!confirm(msg)) return
    removeBrief(undefined, { onSuccess: onClose })
  }

  // Pitch edit goes to the company's brief, the answers to this application. Save both, and
  // close only once the answers land.
  const save = () => {
    const pitchChanged = showBrief && pitchText !== initialPitch
    const saveAnswers = () => mutate(toRequest(items), { onSuccess: onClose })
    if (pitchChanged) saveBrief([{ fieldKey: BRIEF_PITCH_KEY, text: pitchText }], { onSuccess: saveAnswers })
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
          {showBrief && (
            <div className="prep-field" key="brief-pitch">
              <div className="prep-field-head">
                <span className="prep-field-label">✨ {t('brief.pitchLabel')}</span>
                <button
                  className="prep-remove-btn"
                  data-cy="brief-pitch-delete"
                  onClick={deletePitch}
                  disabled={removingBrief}
                  aria-label={t('brief.delete')}
                >
                  ✕
                </button>
              </div>
              <textarea
                className="prep-textarea"
                data-cy={`brief-edit-${BRIEF_PITCH_KEY}`}
                value={pitchText}
                maxLength={MAX_BRIEF}
                placeholder={t('brief.insufficient')}
                onChange={e => setPitchText(e.target.value)}
              />
            </div>
          )}
          {items.map((item, index) => (
            <div className="prep-field" key={`custom-${index}`}>
              <div className="prep-field-head">
                <input
                  className="prep-label-input"
                  type="text"
                  value={item.label ?? ''}
                  placeholder={t('answers.customLabelPlaceholder')}
                  onChange={e => setLabel(index, e.target.value)}
                />
                <button className="prep-remove-btn" onClick={() => removeCustom(index)} aria-label={t('answers.removeCustom')}>
                  ✕
                </button>
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
