import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthProvider'
import { acceptConsent, logout } from '../../services/api'
import './ConsentGate.css'

interface ConsentGateProps {
  children: React.ReactNode
}

export function ConsentGate({ children }: ConsentGateProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [isChecked, setIsChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user && user.privacyPolicyAcceptedAt) {
    return <>{children}</>
  }

  const handleAccept = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await acceptConsent()
      // A full reload rather than a state update: consent changes what every downstream request is
      // allowed to do, so the simplest correct move is to start the app over with the new answer.
      window.location.reload()
    } catch {
      setError(t('consent.error') || 'Failed to accept privacy policy')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch {
      // Declining consent has to end the session no matter what the server says.
      localStorage.removeItem('applikon_token')
      window.location.href = '/'
    }
  }

  return (
    <div className="consent-gate-overlay">
      <div className="consent-gate-container">
        <div className="consent-content">
          <h1 className="consent-title">{t('consent.title')}</h1>

          <p className="consent-description">
            {t('consent.description')}
          </p>

          <div className="consent-policy-link">
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              {t('consent.linkToPolicy')}
            </a>
          </div>

          <div className="consent-checkbox-wrapper">
            <input
              type="checkbox"
              id="privacy-checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="consent-checkbox"
            />
            <label htmlFor="privacy-checkbox" className="consent-checkbox-label">
              {t('consent.checkbox')}
            </label>
          </div>

          {error && <div className="consent-error">{error}</div>}

          <div className="consent-buttons">
            <button
              onClick={handleAccept}
              disabled={!isChecked || isLoading}
              className="consent-button-accept"
            >
              {isLoading ? t('consent.loading') : t('consent.acceptButton')}
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="consent-button-logout"
            >
              {t('consent.logoutButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
