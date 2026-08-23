import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../components/auth/AuthProvider'
import LanguageSwitcher from '../components/LanguageSwitcher'
import './LandingPage.css'

const PORTALS = ['LinkedIn', 'NoFluffJobs', 'JustJoin.it', 'Pracuj.pl', 'Bulldogjob', 'Rocket Jobs', 'Solid.jobs', 'TheProtocol']

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { t } = useTranslation()
  const [portalIndex, setPortalIndex] = useState(0)
  const [portalVisible, setPortalVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setPortalVisible(false)
      setTimeout(() => {
        setPortalIndex(i => (i + 1) % PORTALS.length)
        setPortalVisible(true)
      }, 200)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL?.split('/api')[0] || 'http://localhost:8080'
    window.location.href = `${backendUrl}/oauth2/authorization/google`
  }

  return (
    <div className="landing-page">

      {/* NAV */}
      <nav className="lp-nav">
        <img src="/logo-trim.png" alt="Applikon" className="lp-nav-logo" />
        <div className="lp-nav-right">
          <LanguageSwitcher />
          <Link to="/privacy" className="lp-nav-privacy">{t('landing.privacyLink')}</Link>
        </div>
      </nav>

      {/* HERO */}
      <div className="lp-hero-wrapper">
        <div className="lp-hero-blob lp-hero-blob-1" />
        <div className="lp-hero-blob lp-hero-blob-2" />
        <section className="lp-hero">
          <div className="lp-hero-text">
<h1 className="lp-headline">
              {t('landing.headline1')}<br />
              <span className="lp-headline-accent">{t('landing.headline2')}</span>
            </h1>
            <p className="lp-subtitle">
              {t('landing.subtitlePart1')}{' '}
              <span style={{ whiteSpace: 'nowrap' }}>
                {t('landing.subtitlePart1b')}{' '}
                <span
                  className="lp-portal"
                  style={{
                    opacity: portalVisible ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <span className="lp-portal-name">{PORTALS[portalIndex]}</span>
                </span>
              </span>
              <br />
              {t('landing.subtitlePart4pre')}<strong>{t('landing.subtitlePart4brand')}</strong>{t('landing.subtitlePart4')}
            </p>
            <div className="lp-cta-group">
              <button className="lp-google-btn" onClick={handleGoogleLogin}>
                <GoogleIcon />
                {t('landing.ctaBtn')}
              </button>
              <p className="lp-trust">
                {t('landing.ctaNote')}{' '}
                <Link to="/privacy">{t('landing.privacyLink')}</Link>
              </p>
            </div>
          </div>

          <div className="lp-preview">
            <div className="lp-preview-bar">
              <span className="lp-dot lp-dot-r" />
              <span className="lp-dot lp-dot-y" />
              <span className="lp-dot lp-dot-g" />
              <span className="lp-preview-title">Applikon</span>
            </div>
            <div className="lp-kanban">
              <div className="lp-col">
                <div className="lp-col-header" style={{ borderTopColor: '#3498db' }}>
                  <span>{t('kanban.statusSENT')}</span>
                  <span className="lp-cnt">2</span>
                </div>
                <div className="lp-card">
                  <div className="lp-c-company">Allegro</div>
                  <div className="lp-c-role">Java Developer</div>
                  <div className="lp-card-date"><span>{t('kanban.cardDate')}</span><span>12.05</span></div>
                </div>
                <div className="lp-card">
                  <div className="lp-c-company">OLX Group</div>
                  <div className="lp-c-role">Backend Engineer</div>
                  <div className="lp-card-date"><span>{t('kanban.cardDate')}</span><span>14.05</span></div>
                </div>
              </div>
              <div className="lp-col">
                <div className="lp-col-header" style={{ borderTopColor: '#f39c12' }}>
                  <span>{t('kanban.statusIN_PROGRESS')}</span>
                  <span className="lp-cnt">2</span>
                </div>
                <div className="lp-card">
                  <div className="lp-c-company">XTB</div>
                  <div className="lp-c-role">Spring Boot Dev</div>
                  <div className="lp-stage-btn"><span className="lp-stage-full">💻 {t('stage.recruitmentTask')}</span><span className="lp-stage-short">💻 {t('landing.stageTask')}</span><span className="lp-stage-arrow">▾</span></div>
                  <div className="lp-card-date"><span>{t('kanban.cardDate')}</span><span>10.05</span></div>
                </div>
                <div className="lp-card">
                  <div className="lp-c-company">Software Mind</div>
                  <div className="lp-c-role">Fullstack Java</div>
                  <div className="lp-stage-btn"><span className="lp-stage-full">📞 {t('stage.hrInterview')}</span><span className="lp-stage-short">📞 {t('landing.stageHR')}</span><span className="lp-stage-arrow">▾</span></div>
                  <div className="lp-card-date"><span>{t('kanban.cardDate')}</span><span>15.05</span></div>
                </div>
              </div>
              <div className="lp-col">
                <div className="lp-col-header" style={{ borderTopColor: '#95a5a6' }}>
                  <span>{t('kanban.statusFINISHED')}</span>
                  <span className="lp-cnt">1</span>
                </div>
                <div className="lp-card">
                  <div className="lp-c-company">Comarch</div>
                  <div className="lp-c-role">Java Developer</div>
                  <div className="lp-card-date">👻 {t('kanban.rejectionNoResponse')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* FOR WHOM */}
      <section className="lp-forwhom">
        <h2>{t('landing.forWhomTitle')}</h2>
        <div className="lp-forwhom-grid">
          <div className="lp-forwhom-card">
            <span className="lp-forwhom-icon">👨‍💻</span>
            <h3>{t('landing.forWhom1Title')}</h3>
            <p>{t('landing.forWhom1Desc')}</p>
          </div>
          <div className="lp-forwhom-card">
            <span className="lp-forwhom-icon">📊</span>
            <h3>{t('landing.forWhom2Title')}</h3>
            <p>{t('landing.forWhom2Desc')}</p>
          </div>
          <div className="lp-forwhom-card">
            <span className="lp-forwhom-icon">🔄</span>
            <h3>{t('landing.forWhom3Title')}</h3>
            <p>{t('landing.forWhom3Desc')}</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-features">
        <h2>{t('landing.featuresTitle')}</h2>
        <div className="lp-features-grid">
          <div className="lp-feature-card">
            <span className="lp-feat-icon">🗂️</span>
            <h3>{t('landing.feat1Title')}</h3>
            <p>{t('landing.feat1Desc')}</p>
          </div>
          <div className="lp-feature-card">
            <span className="lp-feat-icon">📋</span>
            <h3>{t('landing.feat2Title')}</h3>
            <p>{t('landing.feat2Desc')}</p>
          </div>
          <div className="lp-feature-card lp-feat-mobile-hide">
            <span className="lp-feat-icon">📝</span>
            <h3>{t('landing.feat3Title')}</h3>
            <p>{t('landing.feat3Desc')}</p>
          </div>
          <div className="lp-feature-card lp-feat-mobile-hide">
            <span className="lp-feat-icon">👤</span>
            <h3>{t('landing.feat4Title')}</h3>
            <p>{t('landing.feat4Desc')}</p>
          </div>
          <div className="lp-feature-card lp-feat-mobile-only">
            <span className="lp-feat-icon">📝</span>
            <h3>{t('landing.feat34Title')}</h3>
            <p>{t('landing.feat34Desc')}</p>
          </div>
          <div className="lp-feature-card lp-feat-desktop-only">
            <span className="lp-feat-icon">📂</span>
            <h3>{t('landing.feat5Title')}</h3>
            <p>{t('landing.feat5Desc')}</p>
          </div>
          <div className="lp-feature-card lp-feat-desktop-only">
            <span className="lp-feat-icon">🔗</span>
            <h3>{t('landing.feat6Title')}</h3>
            <p>{t('landing.feat6Desc')}</p>
          </div>
        </div>
      </section>

      {/* WHY GOOGLE */}
      <section className="lp-why">
        <h2>{t('landing.whyTitle')}</h2>
        <div className="lp-why-grid">
          <div className="lp-why-card">
            <span className="lp-why-icon">🔒</span>
            <div>
              <h3>{t('landing.why1Title')}</h3>
              <p>{t('landing.why1Desc')}</p>
            </div>
          </div>
          <div className="lp-why-card">
            <span className="lp-why-icon">🛡️</span>
            <div>
              <h3>{t('landing.why2Title')}</h3>
              <p>{t('landing.why2Desc')}</p>
            </div>
          </div>
          <div className="lp-why-card lp-feat-desktop-only">
            <span className="lp-why-icon">📱</span>
            <div>
              <h3>{t('landing.why3Title')}</h3>
              <p>{t('landing.why3Desc')}</p>
            </div>
          </div>
          <div className="lp-why-card">
            <span className="lp-why-icon">👁️</span>
            <div>
              <h3>{t('landing.why4Title')}</h3>
              <p>{t('landing.why4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="lp-footer-cta">
        <h2>{t('landing.footerCta')}</h2>
        <button className="lp-footer-btn" onClick={handleGoogleLogin}>
          <GoogleIcon />
          {t('landing.footerBtn')}
        </button>
        <Link to="/privacy" className="lp-footer-privacy">{t('landing.privacyLink')}</Link>
      </section>

    </div>
  )
}
