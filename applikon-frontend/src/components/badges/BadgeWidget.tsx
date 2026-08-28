import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { useBadgeStats } from '../../hooks/useBadgeStats'
import type { BadgeInfo } from '../../types/domain'

const getIconForBadge = (name: string): string => {
  const icons: Record<string, string> = {
    'Rękawica': '🥊',
    'Patelnia': '🍳',
    'Niezniszczalny': '🦾',
    'Legenda Linkedina': '👑',
    'Statystyczna Pewność': '🎰',
    'Widmo': '👻',
    'Cierpliwy Mnich': '🧘',
    'Detektyw': '🔍',
    'Człowiek-Duch': '🫥',
    'Król Ciszy': '🤫',
  }
  return icons[name] ?? '🔒'
}

const calculateProgress = (current: number, target: number | null): number => {
  if (!target) return 100
  return Math.min(100, Math.round((current / target) * 100))
}

interface BadgeRowProps {
  badge: BadgeInfo | null
  count: number
  type: 'rejection' | 'ghosting'
}

// Both badge tracks share this first threshold.
const FIRST_THRESHOLD = 5

function BadgeRow({ badge, count, type }: BadgeRowProps) {
  const { t } = useTranslation('badges')
  const isGhosting = type === 'ghosting'
  const hasAchieved = Boolean(badge?.name)
  const isMaxed = hasAchieved && !badge?.nextThreshold

  // Before the first badge the bar aims at 5; after it, at whatever comes next.
  const progressTarget = hasAchieved ? (badge?.nextThreshold ?? null) : FIRST_THRESHOLD
  const progressLabel = hasAchieved ? (badge?.nextThreshold ?? null) : FIRST_THRESHOLD

  // The API still returns Polish names; they key the icon lookup.
  const nextBadgeApiName = hasAchieved ? badge?.nextBadgeName : (isGhosting ? 'Widmo' : 'Rękawica')
  // Display name comes from i18n instead.
  const nextBadgeDisplayName = hasAchieved
    ? (badge?.nextBadgeName ? t(`names.${badge.nextBadgeName}` as unknown as ParseKeys<'badges'>) : undefined)
    : (isGhosting ? t('defaults.firstGhosting') : t('defaults.firstRejection'))

  const displayName: string = hasAchieved
    ? t(`names.${badge?.name ?? ''}` as unknown as ParseKeys<'badges'>)
    : (isGhosting ? t('defaults.firstGhosting') : t('defaults.firstRejection'))

  return (
    <div data-cy={`badge-row-${type}`} className="badge-row">
      <div className="badge-row-left">
        <span data-cy="badge-icon" className={`badge-row-icon ${!hasAchieved ? 'locked' : ''}`}>
          {hasAchieved ? badge?.icon : (isGhosting ? '👻' : '🥊')}
        </span>
        <div className="badge-row-info">
          <div data-cy="badge-name" className="badge-row-name">
            {displayName}
          </div>
          <div className="badge-row-description">
            {hasAchieved ? badge?.description : t('widget.toUnlock', { count, threshold: FIRST_THRESHOLD })}
          </div>
          <div className="badge-row-progress">
            <div className={`badge-progress-bar ${isGhosting ? 'ghosting' : ''}`}>
              <div
                className="badge-progress-fill"
                style={{ width: `${calculateProgress(count, progressTarget)}%` }}
              />
            </div>
            <span className="badge-progress-count">{count}/{progressLabel ?? '∞'}</span>
          </div>
          {!isMaxed && nextBadgeApiName && (
            <div data-cy="badge-next" className="badge-row-next-line">
              {t('widget.next', { icon: getIconForBadge(nextBadgeApiName), name: nextBadgeDisplayName })}
            </div>
          )}
        </div>
      </div>
      {isMaxed && <div data-cy="badge-max" className="badge-row-max">{t('widget.max')}</div>}
    </div>
  )
}

export function BadgeWidget() {
  const { t } = useTranslation('badges')
  const [expanded, setExpanded] = useState(false)
  const { data: stats } = useBadgeStats()

  if (!stats) return null

  const { rejectionBadge, ghostingBadge, sweetRevengeUnlocked, totalRejections, totalGhosting } = stats

  return (
    <div className="badge-widget">
      <div data-cy="badge-widget-header" className="badge-widget-header" onClick={() => setExpanded(!expanded)}>
        <span data-cy="badge-widget-title" className="badge-header-title">{t('widget.title')}</span>
        <span className="badge-expand-arrow">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="badge-modal" onClick={() => setExpanded(false)}>
          <div className="badge-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="badge-modal-header">
              <div className="badge-modal-title">{t('widget.title')}</div>
            </div>

            <div className="badge-modal-body">
              <div data-cy="badge-section-rejections" className="badge-section-label">{t('widget.rejections', { count: totalRejections })}</div>
              <BadgeRow badge={rejectionBadge} count={totalRejections} type="rejection" />

              <div data-cy="badge-section-ghosting" className="badge-section-label">{t('widget.ghosting', { count: totalGhosting })}</div>
              <BadgeRow badge={ghostingBadge} count={totalGhosting} type="ghosting" />

              {sweetRevengeUnlocked && (
                <div data-cy="badge-sweet-revenge" className="badge-row sweet-revenge">
                  <div className="badge-row-left">
                    <span className="badge-row-icon special">🏆</span>
                    <div className="badge-row-info">
                      <div className="badge-row-name special">{t('sweetRevenge.name')}</div>
                      <div className="badge-row-description">{t('sweetRevenge.description')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="badge-modal-actions">
              <button className="badge-modal-btn" onClick={() => setExpanded(false)}>
                {t('widget.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
