import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PREDEFINED_STAGES, normalizeStageKey } from './kanban'

interface StageModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (stage: string) => void
  currentStage?: string | null
}

export function StageModal({ isOpen, onClose, onSelect, currentStage }: StageModalProps) {
  const { t } = useTranslation()
  const [customStage, setCustomStage] = useState('')

  if (!isOpen) return null

  const handleSelect = (stageKey: string) => {
    onSelect(stageKey)
    onClose()
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customStage.trim()) {
      onSelect(customStage.trim())
      setCustomStage('')
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>{t('stage.modalTitle')}</h3>
        <div className="stage-options">
          {PREDEFINED_STAGES.map(stage => (
            <button
              key={stage.key}
              className={`stage-option ${normalizeStageKey(currentStage) === stage.key ? 'active' : ''}`}
              onClick={() => handleSelect(stage.key)}
            >
              {t(stage.labelKey)}
            </button>
          ))}
        </div>
        <form onSubmit={handleCustomSubmit} className="custom-stage">
          <input
            type="text"
            placeholder={t('stage.customPlaceholder')}
            value={customStage}
            onChange={(e) => setCustomStage(e.target.value)}
          />
          <button type="submit" disabled={!customStage.trim()}>{t('stage.customAdd')}</button>
        </form>
        <button className="modal-close" onClick={onClose}>{t('stage.cancel')}</button>
      </div>
    </div>
  )
}
