import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application } from '../../types/domain'
import type { KanbanStatus } from './kanban'

interface MoveModalProps {
  isOpen: boolean
  onClose: () => void
  card: Application | null
  statuses: KanbanStatus[]
  onMove: (status: string) => void
  getApplicationsByStatus: (statusId: string) => Application[]
}

export function MoveModal({ isOpen, onClose, card, statuses, onMove, getApplicationsByStatus }: MoveModalProps) {
  const { t } = useTranslation()
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  useEffect(() => {
    if (card) {
      setSelectedStatus(card.status === 'OFFER' || card.status === 'REJECTED' ? 'FINISHED' : card.status)
    }
  }, [card])

  if (!isOpen || !card) return null

  const currentStatus = card.status === 'OFFER' || card.status === 'REJECTED' ? 'FINISHED' : card.status

  const handleMove = () => {
    if (selectedStatus && selectedStatus !== currentStatus) {
      onMove(selectedStatus)
    }
    onClose()
  }

  return (
    <div className="move-modal" onClick={onClose}>
      <div className="move-modal-content" onClick={e => e.stopPropagation()}>
        <div className="move-modal-header">
          <div className="move-modal-title">{t('moveModal.title')}</div>
        </div>

        <div className="move-options">
          {statuses.map(status => {
            const isCurrent = status.id === currentStatus
            const isSelected = status.id === selectedStatus
            const count = getApplicationsByStatus(status.id).length

            return (
              <div
                key={status.id}
                className={`move-option ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                onClick={() => !isCurrent && setSelectedStatus(status.id)}
              >
                <div className="move-option-radio"></div>
                <div className="move-option-color" style={{ background: status.color }}></div>
                <div className="move-option-text">
                  <div className="move-option-name">{t(status.labelKey)}</div>
                  <div className="move-option-count">{t('moveModal.appCount', { count })}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="move-modal-actions">
          <button className="move-modal-btn cancel" onClick={onClose}>{t('moveModal.cancel')}</button>
          <button
            className="move-modal-btn confirm"
            onClick={handleMove}
            disabled={!selectedStatus || selectedStatus === currentStatus}
          >
            {t('moveModal.move')}
          </button>
        </div>
      </div>
    </div>
  )
}
