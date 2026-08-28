import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NotesList } from '../notes/NotesList'
import { ApplicationForm } from './ApplicationForm'
import { StageModal } from '../kanban/StageModal'
import { EndModal } from '../kanban/EndModal'
import { GenerateBriefButton } from '../prep/BriefSection'
import { CollapsibleSection } from '../prep/CollapsibleSection'
import { CompanyPrepReadonly, GlobalAnswersReadonly } from '../prep/PrepReadonly'
import { CompanyQuestionsModal } from '../prep/CompanyQuestionsModal'
import { GlobalAnswersModal } from '../prep/GlobalAnswersModal'
import { downloadCV } from '../../services/api'
import { isSafeUrl } from '../../utils/urlValidator'
import { formatSalary } from '../../utils/salary'
import { STATUS_CONFIG } from '../../constants/applicationStatus'
import { translateStageName, STATUSES } from '../kanban/kanban'
import type { Application, StageUpdateRequest } from '../../types/domain'

interface Props {
  application: Application
  onBack: () => void
  onDelete: (id: number) => void
  onStageChange: (id: number, data: StageUpdateRequest) => void
  applications: Application[]
}

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Distinct accents so the sections are told apart at a glance, not by reading headers.
const ACCENT_CHEAT = '#0ea5a5'
const ACCENT_INFO = '#667eea'
const ACCENT_JOB = '#e08e0b'
const ACCENT_NOTES = '#9b59b6'

export function ApplicationDetails({ application, onBack, onDelete, onStageChange, applications }: Props) {
  const { t, i18n } = useTranslation()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [stageModalOpen, setStageModalOpen] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [editNote, setEditNote] = useState(false)
  const [editGlobal, setEditGlobal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentColumn = application.status === 'OFFER' || application.status === 'REJECTED'
    ? 'FINISHED'
    : application.status

  const getStatusCount = (statusId: string) => {
    if (statusId === 'FINISHED') return applications.filter(a => a.status === 'OFFER' || a.status === 'REJECTED').length
    return applications.filter(a => a.status === statusId).length
  }

  const openStatusChange = () => {
    setSelectedStatus(currentColumn)
    setMoveModalOpen(true)
  }

  const handleMoveConfirm = () => {
    if (!selectedStatus) { setMoveModalOpen(false); return }
    // "In progress" always routes to the stage picker, even when the application
    // is already in progress, so the specific stage can be changed (like Kanban).
    if (selectedStatus === 'IN_PROGRESS') {
      setMoveModalOpen(false)
      setStageModalOpen(true)
      return
    }
    if (selectedStatus === currentColumn) { setMoveModalOpen(false); return }
    if (selectedStatus === 'FINISHED') {
      setMoveModalOpen(false)
      setEndModalOpen(true)
      return
    }
    if (selectedStatus === 'SENT') {
      onStageChange(application.id, { status: 'SENT', currentStage: null, rejectionReason: null, rejectionDetails: null })
    }
    setMoveModalOpen(false)
  }

  const handleStageSelect = (stageName: string) => {
    onStageChange(application.id, { status: 'IN_PROGRESS', currentStage: stageName })
    setStageModalOpen(false)
  }

  const handleEndSelect = (endData: StageUpdateRequest) => {
    onStageChange(application.id, endData)
    setEndModalOpen(false)
  }

  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const salary = formatSalary(application, i18n.language, t)

  // Status and stage read as one thing to the user, e.g. "In progress (Final interview)".
  const statusLabel = t(STATUS_CONFIG[application.status].labelKey)
  const statusText = application.currentStage
    ? `${statusLabel} (${translateStageName(application.currentStage, t)})`
    : statusLabel

  return (
    <div className="details-view">
      <div className="details-nav">
        <button className="back-btn" onClick={onBack}>
          {t('details.back')}
        </button>
      </div>

      <div className="details-header">
        <div className="details-title">
          <div className="details-title-row">
            <h2>{application.company}</h2>
            <div className="details-menu-wrapper" ref={menuRef}>
              <button
                className="details-menu-btn"
                onClick={(e) => { e.stopPropagation(); setShowMenu(m => !m) }}
              >⋮</button>
              {showMenu && (
                <div className="context-menu">
                  <button
                    className="context-menu-item"
                    onClick={() => { setShowMenu(false); setShowEditForm(true) }}
                  >
                    {t('details.edit')}
                  </button>
                  <button
                    className="context-menu-item danger"
                    onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                  >
                    🗑️ {t('table.delete')}
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="details-position">{application.position}</p>
          <div className="status-info">
            <span
              className="status-badge large"
              style={{ backgroundColor: STATUS_CONFIG[application.status].color }}
            >
              {statusText}
            </span>
            <button className="status-edit-btn" onClick={openStatusChange}>
              ✏️ {t('details.changeStatus')}
            </button>
          </div>
        </div>
      </div>

      {showEditForm && (
        <ApplicationForm
          mode="edit"
          application={application}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {editNote && <CompanyQuestionsModal application={application} onClose={() => setEditNote(false)} />}
      {editGlobal && <GlobalAnswersModal onClose={() => setEditGlobal(false)} />}

      {showDeleteConfirm && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h3>{t('table.confirmDeleteTitle')}</h3>
            <p>{t('table.confirmDeleteMsg', { count: 1 })}</p>
            <p className="confirm-warning">{t('table.confirmDeleteWarning')}</p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setShowDeleteConfirm(false)}>
                {t('table.cancel')}
              </button>
              <button className="confirm-btn delete" onClick={() => { setShowDeleteConfirm(false); onDelete(application.id) }}>
                {t('table.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status change — centered dialog (not a mobile-style bottom sheet) */}
      {moveModalOpen && (
        <div className="prep-modal-overlay" onClick={() => setMoveModalOpen(false)}>
          <div className="prep-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="prep-modal-head">
              <h2>{t('moveModal.title')}</h2>
              <button className="prep-modal-close" onClick={() => setMoveModalOpen(false)} aria-label={t('app.close')}>×</button>
            </div>
            <div className="prep-modal-body">
              <div className="move-options">
                {STATUSES.map(status => {
                  const isCurrent = status.id === currentColumn
                  const isSelected = status.id === selectedStatus
                  return (
                    <div
                      key={status.id}
                      className={`move-option ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                      onClick={() => { if (!isCurrent || status.id === 'IN_PROGRESS') setSelectedStatus(status.id) }}
                    >
                      <div className="move-option-radio"></div>
                      <div className="move-option-color" style={{ background: status.color }}></div>
                      <div className="move-option-text">
                        <div className="move-option-name">{t(status.labelKey)}</div>
                        <div className="move-option-count">{t('moveModal.appCount', { count: getStatusCount(status.id) })}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="prep-modal-actions">
              <button className="prep-modal-btn cancel" onClick={() => setMoveModalOpen(false)}>{t('moveModal.cancel')}</button>
              <button
                className="prep-modal-btn save"
                onClick={handleMoveConfirm}
                disabled={!selectedStatus || (selectedStatus === currentColumn && selectedStatus !== 'IN_PROGRESS')}
              >
                {t('moveModal.move')}
              </button>
            </div>
          </div>
        </div>
      )}

      <StageModal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        onSelect={handleStageSelect}
        currentStage={application.currentStage}
      />

      <EndModal
        isOpen={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        onSelect={handleEndSelect}
      />

      <div className="details-sections">
        <CollapsibleSection
          title={t('details.sectionCheat')}
          icon="📋"
          accent={ACCENT_CHEAT}
        >
          <div className="prep-subblock" style={{ '--section-accent': ACCENT_CHEAT } as unknown as CSSProperties}>
            <div className="prep-subblock-head">
              <span style={{ color: ACCENT_CHEAT }}>🏢 {t('cheatSheet.companySection')}</span>
              <span className="prep-subblock-actions">
                <GenerateBriefButton applicationId={application.id} />
                <button className="prep-edit-link" onClick={() => setEditNote(true)}>{t('cheatSheet.edit')}</button>
              </span>
            </div>
            <CompanyPrepReadonly application={application} salary={salary} />
          </div>
          <div className="prep-subblock" style={{ '--section-accent': ACCENT_INFO } as unknown as CSSProperties}>
            <div className="prep-subblock-head">
              <span style={{ color: ACCENT_INFO }}>💬 {t('cheatSheet.globalSection')}</span>
              <button className="prep-edit-link" onClick={() => setEditGlobal(true)}>{t('cheatSheet.edit')}</button>
            </div>
            <GlobalAnswersReadonly />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={t('details.infoTitle')} icon="ℹ️" accent={ACCENT_INFO}>
          <div className="info-list">
            {application.source && (
              <div className="info-item">
                <span className="label">{t('details.source')}</span>
                <span className="value">{application.source}</span>
              </div>
            )}
            <div className="info-item">
              <span className="label">{t('details.date')}</span>
              <span className="value">{formatDate(application.appliedAt, i18n.language)}</span>
            </div>
            {application.link && isSafeUrl(application.link) && (
              <div className="info-item">
                <span className="label">{t('details.link')}</span>
                <a
                  href={application.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="value link"
                >
                  {t('details.viewOffer')}
                </a>
              </div>
            )}
            {application.cvFileName && (
              <div className="info-item">
                <span className="label">{t('details.cv')}</span>
                <span className="value cv-value">
                  {application.cvFileName}
                  {application.cvType === 'FILE' && (
                    <button
                      className="cv-download-btn"
                      onClick={() => downloadCV(application.cvId!, application.cvFileName!)}
                    >
                      {t('details.download')}
                    </button>
                  )}
                  {application.cvType === 'LINK' && application.cvExternalUrl && (
                    <button
                      className="cv-download-btn cv-link-btn"
                      onClick={() => window.open(application.cvExternalUrl!, '_blank')}
                    >
                      {t('details.open')}
                    </button>
                  )}
                  {application.cvType === 'NOTE' && (
                    <span className="cv-note-hint">{t('details.local')}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {application.jobDescription && (
          <CollapsibleSection title={t('details.jobDescription')} icon="📄" accent={ACCENT_JOB}>
            <pre className="job-description-content">{application.jobDescription}</pre>
          </CollapsibleSection>
        )}

        <CollapsibleSection title={t('details.sectionNotes')} icon="📝" accent={ACCENT_NOTES}>
          <NotesList applicationId={application.id} />
        </CollapsibleSection>
      </div>
    </div>
  )
}
