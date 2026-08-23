import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthProvider'
import { Footer } from '../components/layout/Footer'
import { deleteAccount, exportMyData } from '../services/api'
import './Settings.css'

export function Settings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleBack = () => navigate('/dashboard')

  const [accountExpanded, setAccountExpanded] = useState(false)
  const [archiveExpanded, setArchiveExpanded] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteModal) setShowDeleteModal(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [showDeleteModal])

  const handleExport = async () => {
    setExporting(true)
    setExportError(false)
    try {
      await exportMyData()
    } catch {
      setExportError(true)
    } finally {
      setExporting(false)
    }
  }

  const confirmWord = t('settings.deleteAccount.confirmWord') || 'DELETE'
  const isConfirmValid = confirmInput === confirmWord

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
    setConfirmInput('')
    setError(null)
  }

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true)
      setError(null)
      await deleteAccount()
      alert(t('settings.deleteAccount.success') || 'Account deleted')
      const keysToRemove = Object.keys(localStorage).filter(
        key => key.startsWith('applikon_') || key === 'tour_completed'
      )
      keysToRemove.forEach(key => localStorage.removeItem(key))
      setTimeout(() => { window.location.href = '/' }, 100)
    } catch {
      setError(t('settings.deleteAccount.error') || 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  if (!user) return <div>{t('app.loading')}</div>

  const privacyAcceptedAt = user.privacyPolicyAcceptedAt
    ? new Date(user.privacyPolicyAcceptedAt).toLocaleDateString(
        t('settings.dateLocale') || 'pl-PL'
      )
    : '—'

  return (
    <div className="settings-page">
      <div className="settings-container">
        <button className="back-btn" onClick={handleBack}>
          {t('details.back')}
        </button>
        <h1>⚙️ {t('settings.title')}</h1>

        <div className="settings-accordion">
          <button
            className="settings-accordion-header"
            onClick={() => setAccountExpanded(v => !v)}
          >
            <span>👤 {t('settings.accountSection')}</span>
            <span className={`settings-chevron${accountExpanded ? ' settings-chevron--open' : ''}`}>›</span>
          </button>
          {accountExpanded && (
            <div className="settings-accordion-body">
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-row-icon">📧</span>
                  <span className="settings-row-label">{t('settings.emailLabel')}</span>
                </div>
                <span className="settings-row-value">{user.email}</span>
              </div>
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-row-icon">📋</span>
                  <span className="settings-row-label">{t('settings.privacyAcceptedAt')}</span>
                </div>
                <span className="settings-row-value">
                  {privacyAcceptedAt !== '—' ? <>✅ {privacyAcceptedAt}</> : '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="settings-accordion">
          <button
            className="settings-accordion-header"
            onClick={() => setArchiveExpanded(v => !v)}
          >
            <span>🗄️ {t('settings.exportTitle')}</span>
            <span className={`settings-chevron${archiveExpanded ? ' settings-chevron--open' : ''}`}>›</span>
          </button>
          {archiveExpanded && (
            <div className="settings-accordion-body">
              <div className="settings-row">
                <div className="settings-row-left">
                  <span className="settings-row-icon">📦</span>
                  <span className="settings-row-desc">{t('settings.exportDescription')}</span>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="settings-action-btn"
                >
                  {exporting ? t('settings.exporting') : t('settings.exportButton')}
                </button>
              </div>
              {exportError && (
                <p className="settings-inline-error">{t('settings.exportError')}</p>
              )}
            </div>
          )}
        </div>

        <p className="settings-group-label settings-group-label--danger">
          {t('settings.dangerZone')}
        </p>
        <div className="settings-group settings-group--danger">
          <div className="settings-row">
            <div className="settings-row-left">
              <span className="settings-row-icon">🗑️</span>
              <span className="settings-row-label">{t('settings.deleteAccount.button')}</span>
            </div>
            <button
              onClick={handleDeleteClick}
              className="settings-action-btn settings-action-btn--danger"
            >
              {t('settings.deleteAccount.button')}
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="settings-modal-overlay">
          <div className="settings-modal">
            <h2 className="settings-modal-title">
              {t('settings.deleteAccount.confirmTitle')}
            </h2>
            <div className="settings-modal-warning">
              {t('settings.deleteAccount.warning')}
            </div>
            <div className="settings-modal-field">
              <label>{t('settings.deleteAccount.confirmInputPrompt')}</label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={confirmWord}
                disabled={isDeleting}
                className="settings-modal-input"
              />
            </div>
            {error && <div className="settings-modal-error">{error}</div>}
            <div className="settings-modal-buttons">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="settings-modal-cancel"
              >
                {t('settings.deleteAccount.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={!isConfirmValid || isDeleting}
                className="settings-modal-confirm"
              >
                {isDeleting ? t('app.loading') : t('settings.deleteAccount.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
