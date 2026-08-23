import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './components/auth/AuthProvider'
import KanbanBoard from './components/kanban/KanbanBoard'
import CVManager from './components/cv/CVManager'
import { CheatSheet } from './components/cheatsheet/CheatSheet'
import ApplicationTable from './components/applications/ApplicationTable'
import { BadgeWidget } from './components/badges/BadgeWidget'
import TourGuide from './components/tour/TourGuide'
import { ApplicationForm } from './components/applications/ApplicationForm'
import { ApplicationDetails } from './components/applications/ApplicationDetails'
import { Footer } from './components/layout/Footer'
import LanguageSwitcher from './components/LanguageSwitcher'
import { ServiceBanner } from './components/notices/ServiceBanner'
import { ServiceModal } from './components/notices/ServiceModal'
import { useServiceNotices } from './hooks/useServiceNotices'
import {
  useApplications,
  useUpdateStatus,
  useUpdateStage,
  useDeleteApplication,
  applicationKeys,
} from './hooks/useApplications'
import type { Application, StageUpdateRequest } from './types/domain'
import './App.css'

type View = 'kanban' | 'list' | 'cv' | 'answers'

const VIEWS: View[] = ['kanban', 'list', 'cv', 'answers']

export default function AppContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  // View and selected application live in the URL (?view=list&app=123) so that
  // every screen change creates a browser history entry — the back button
  // navigates within the app instead of leaving it.
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view')
  const view: View = VIEWS.includes(viewParam as View) ? (viewParam as View) : 'kanban'
  const appParam = searchParams.get('app')
  const selectedAppId = appParam !== null ? Number(appParam) : null
  const [showForm, setShowForm] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)

  const queryClient = useQueryClient()
  const { data: notices = [] } = useServiceNotices()
  const banners = notices.filter(n => n.type === 'BANNER')
  const modals = notices.filter(n => n.type === 'MODAL')
  const { data: applications = [], isLoading } = useApplications()
  const updateStatus = useUpdateStatus()
  const updateStage = useUpdateStage()
  const deleteApplication = useDeleteApplication()

  // Derive selected application from the cache — always fresh after any mutation
  const selectedApp = applications.find(a => a.id === selectedAppId) ?? null

  // Synchronize logo width with view tabs width
  useEffect(() => {
    const syncLogoWidth = () => {
      const viewTabs = document.querySelector('.view-tabs') as HTMLElement | null
      const logoWrapper = document.querySelector('.logo-wrapper') as HTMLElement | null
      const logoImg = document.querySelector('.logo') as HTMLElement | null

      if (viewTabs && logoWrapper && logoImg) {
        const targetWidth = viewTabs.offsetWidth
        logoWrapper.style.width = `${targetWidth}px`
        logoImg.style.width = `${targetWidth}px`
      }
    }

    syncLogoWidth()
    window.addEventListener('resize', syncLogoWidth)
    const timeoutId = setTimeout(syncLogoWidth, 100)

    return () => {
      window.removeEventListener('resize', syncLogoWidth)
      clearTimeout(timeoutId)
    }
  }, [view, selectedAppId])

  const setView = (next: View) => {
    if (next === view && selectedAppId === null) return
    setSearchParams(params => {
      params.set('view', next)
      params.delete('app')
      return params
    })
  }

  const handleViewDetails = (app: Application) => {
    setSearchParams(params => {
      params.set('app', String(app.id))
      return params
    })
  }

  const handleBackToList = () => {
    setSearchParams(params => {
      params.delete('app')
      return params
    })
  }

  const handleStatusChange = (applicationId: number, newStatus: string) => {
    updateStatus.mutate({ id: applicationId, status: newStatus })
  }

  const handleStageChange = (applicationId: number, stageData: StageUpdateRequest) => {
    updateStage.mutate({ id: applicationId, data: stageData })
  }

  const handleDeleteApplications = (ids: Set<number>) => {
    ids.forEach(id => deleteApplication.mutate(id))
  }

  const handleEditApplication = (app: Application) => {
    setEditingApp(app)
  }

  const handleDeleteSingle = (id: number) => {
    deleteApplication.mutate(id, {
      onSuccess: () => {
        if (selectedAppId !== null) handleBackToList()
      }
    })
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo-wrapper">
            <img src="/logo-trim.png" alt="Applikon logo" className="logo" />
          </div>
        </div>
        <div className="header-right">
          <BadgeWidget />

          <div className="header-controls">
            <LanguageSwitcher />
            <div className="header-separator" />
            <button
              className="settings-btn"
              onClick={() => navigate('/settings')}
              title={t('settings.title')}
            >
              ⚙️
            </button>
            <button
              data-cy="logout-btn"
              className="logout-btn"
              onClick={() => void signOut()}
            >
              {t('auth.logout')}
            </button>
          </div>

          <div className="hamburger-wrapper">
            <button
              className="hamburger-btn"
              onClick={() => setMenuOpen(prev => !prev)}
              aria-label="Menu"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
            {menuOpen && (
              <>
                <div className="hamburger-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="hamburger-menu">
                  <div className="hamburger-menu-lang">
                    <LanguageSwitcher />
                  </div>
                  <div className="hamburger-divider" />
                  <button
                    className="hamburger-menu-btn"
                    onClick={() => { navigate('/settings'); setMenuOpen(false) }}
                  >
                    ⚙️ {t('settings.title')}
                  </button>
                  <button
                    className="hamburger-menu-btn logout"
                    onClick={() => void signOut()}
                  >
                    {t('auth.logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {banners.map(n => <ServiceBanner key={n.id} notice={n} />)}
      {modals.map(n => <ServiceModal key={n.id} notice={n} />)}

      <TourGuide />

      {!selectedApp && (
        <div className="toolbar">
          <div className="view-tabs">
            <button
              data-cy="tab-kanban"
              className={`tab-btn ${view === 'kanban' ? 'active' : ''}`}
              onClick={() => setView('kanban')}
            >
              {t('nav.kanban')}
            </button>
            <button
              data-cy="tab-lista"
              className={`tab-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              {t('nav.list')}
            </button>
            <button
              data-cy="tab-cv"
              className={`tab-btn ${view === 'cv' ? 'active' : ''}`}
              onClick={() => setView('cv')}
            >
              {t('nav.cv')}
            </button>
            <button
              data-cy="tab-answers"
              className={`tab-btn ${view === 'answers' ? 'active' : ''}`}
              onClick={() => setView('answers')}
            >
              {t('nav.answers')}
            </button>
          </div>
          {view !== 'cv' && view !== 'answers' && (
            <button data-cy="add-application-btn" className="add-btn" onClick={() => setShowForm(!showForm)}>
              {showForm ? t('app.close') : t('app.addApplication')}
            </button>
          )}
        </div>
      )}

      {/* Floating Action Button (Mobile only) */}
      {view !== 'cv' && view !== 'answers' && (
        <button className="fab" onClick={() => setShowForm(!showForm)}>
          <span aria-hidden="true">{showForm ? '✕' : '+'}</span>
        </button>
      )}

      {showForm && (
        <ApplicationForm mode="create" onClose={() => setShowForm(false)} />
      )}

      {editingApp && (
        <ApplicationForm mode="edit" application={editingApp} onClose={() => setEditingApp(null)} />
      )}

      <main className="main-content">
        {isLoading ? (
          <p className="loading">{t('app.loading')}</p>
        ) : selectedApp ? (
          <ApplicationDetails
            application={selectedApp}
            onBack={handleBackToList}
            onDelete={handleDeleteSingle}
            onStageChange={handleStageChange}
            applications={applications}
          />
        ) : view === 'kanban' ? (
          <KanbanBoard
            applications={applications}
            onStatusChange={handleStatusChange}
            onStageChange={handleStageChange}
            onCardClick={handleViewDetails}
          />
        ) : view === 'cv' ? (
          <CVManager
            applications={applications}
            onCVAssigned={() => queryClient.invalidateQueries({ queryKey: applicationKeys.all })}
          />
        ) : view === 'answers' ? (
          <CheatSheet applications={applications} />
        ) : (
          <ApplicationTable
            applications={applications}
            onRowClick={handleViewDetails}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteApplications}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}