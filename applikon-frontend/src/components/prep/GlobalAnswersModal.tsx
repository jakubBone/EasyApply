import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useScreeningAnswers, useSaveScreeningAnswers } from '../../hooks/useScreeningAnswers'
import { buildItems, labelFor, toRequest, FIXED_QUESTION_KEYS, MAX_ANSWER_LENGTH, type Item } from './globalAnswers'
import './prep.css'

// Modal editor for the global "General" answers (built-in template + custom questions).
//  Every row can be removed; the saved set is what's kept, so a removed built-in question
//  stays gone. Confirmed with Save; the read view elsewhere stays read-only.
export function GlobalAnswersModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { t: tErrors } = useTranslation('errors')
  const { data: server = [] } = useScreeningAnswers()
  const { mutate, isPending } = useSaveScreeningAnswers()
  const [items, setItems] = useState<Item[]>(() => buildItems(server, FIXED_QUESTION_KEYS))

  const setAnswer = (index: number, value: string) =>
    setItems(items.map((it, i) => (i === index ? { ...it, answer: value.slice(0, MAX_ANSWER_LENGTH) } : it)))
  const setLabel = (index: number, value: string) =>
    setItems(items.map((it, i) => (i === index ? { ...it, label: value } : it)))
  const addCustom = () => setItems([...items, { questionKey: null, label: '', answer: '', custom: true }])
  const removeItem = (index: number) => {
    if (items[index].answer.trim() !== '' && !confirm(tErrors('answers.deleteConfirm'))) return
    setItems(items.filter((_, i) => i !== index))
  }

  const save = () => mutate(toRequest(items), { onSuccess: onClose })

  return (
    <div className="prep-modal-overlay" onClick={onClose}>
      <div className="prep-modal" data-cy="global-answers-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="prep-modal-head">
          <h2>{t('cheatSheet.editGlobalTitle')}</h2>
          <button className="prep-modal-close" onClick={onClose} aria-label={t('app.close')}>×</button>
        </div>
        <div className="prep-modal-body">
          {items.map((item, index) => (
            <div className="prep-field" key={item.custom ? `custom-${index}` : item.questionKey}>
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
                  <span className="prep-field-label">{labelFor(item, t)}</span>
                )}
                <button className="prep-remove-btn" onClick={() => removeItem(index)} aria-label={t('answers.removeCustom')}>
                  ✕
                </button>
              </div>
              <textarea
                className="prep-textarea"
                value={item.answer}
                maxLength={MAX_ANSWER_LENGTH}
                placeholder={t('answers.answerPlaceholder')}
                onChange={e => setAnswer(index, e.target.value)}
              />
              <div className="prep-counter">{item.answer.length}/{MAX_ANSWER_LENGTH}</div>
            </div>
          ))}
          <button className="prep-add-btn" onClick={addCustom}>+ {t('answers.addCustom')}</button>
        </div>
        <div className="prep-modal-actions">
          <button className="prep-modal-btn cancel" onClick={onClose}>{t('notes.cancel')}</button>
          <button className="prep-modal-btn save" data-cy="prep-save" onClick={save} disabled={isPending}>{t('notes.save')}</button>
        </div>
      </div>
    </div>
  )
}

export default GlobalAnswersModal
