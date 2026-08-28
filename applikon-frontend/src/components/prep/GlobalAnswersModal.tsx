import { useState } from 'react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useScreeningAnswers, useSaveScreeningAnswers } from '../../hooks/useScreeningAnswers'
import { buildItems, toRequest, MAX_ANSWER_LENGTH, type Item } from './globalAnswers'
import './prep.css'

// Modal editor for the global "general" answers (fixed template + custom questions).
//  Confirmed with Save; the read view elsewhere stays read-only.
export function GlobalAnswersModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { data: server = [] } = useScreeningAnswers()
  const { mutate, isPending } = useSaveScreeningAnswers()
  const [items, setItems] = useState<Item[]>(() => buildItems(server))

  const setAnswer = (index: number, value: string) =>
    setItems(items.map((it, i) => (i === index ? { ...it, answer: value.slice(0, MAX_ANSWER_LENGTH) } : it)))
  const setLabel = (index: number, value: string) =>
    setItems(items.map((it, i) => (i === index ? { ...it, label: value } : it)))
  const addCustom = () => setItems([...items, { questionKey: null, label: '', answer: '', custom: true }])
  const removeCustom = (index: number) => setItems(items.filter((_, i) => i !== index))

  const save = () => mutate(toRequest(items), { onSuccess: onClose })

  return (
    <div className="prep-modal-overlay" onClick={onClose}>
      <div className="prep-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="prep-modal-head">
          <h2>{t('cheatSheet.editGlobalTitle')}</h2>
          <button className="prep-modal-close" onClick={onClose} aria-label={t('app.close')}>×</button>
        </div>
        <div className="prep-modal-body">
          {items.map((item, index) => {
            const label = item.custom
              ? item.label ?? ''
              : t(`answers.questions.${item.questionKey}` as unknown as ParseKeys)
            return (
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
                    <span className="prep-field-label">{label}</span>
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
                  maxLength={MAX_ANSWER_LENGTH}
                  placeholder={t('answers.answerPlaceholder')}
                  onChange={e => setAnswer(index, e.target.value)}
                />
                <div className="prep-counter">{item.answer.length}/{MAX_ANSWER_LENGTH}</div>
              </div>
            )
          })}
          <button className="prep-add-btn" onClick={addCustom}>+ {t('answers.addCustom')}</button>
        </div>
        <div className="prep-modal-actions">
          <button className="prep-modal-btn cancel" onClick={onClose}>{t('notes.cancel')}</button>
          <button className="prep-modal-btn save" onClick={save} disabled={isPending}>{t('notes.save')}</button>
        </div>
      </div>
    </div>
  )
}

export default GlobalAnswersModal
