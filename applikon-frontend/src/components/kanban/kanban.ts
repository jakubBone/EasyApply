import type { ParseKeys, TFunction } from 'i18next'
import { STATUS_CONFIG } from '../../constants/applicationStatus'

export const isMobile = () => window.innerWidth <= 768

export interface KanbanStatus {
  id: string
  labelKey: ParseKeys<'common'>
  color: string
}

// SENT/IN_PROGRESS colors are sourced from STATUS_CONFIG so kanban and the
// application table can't drift apart; FINISHED has no STATUS_CONFIG equivalent
// (it covers both OFFER and REJECTED) so it keeps its own color here.
export const STATUSES: KanbanStatus[] = [
  { id: 'SENT',        labelKey: 'kanban.statusSENT',        color: STATUS_CONFIG.SENT.color },
  { id: 'IN_PROGRESS', labelKey: 'kanban.statusIN_PROGRESS', color: STATUS_CONFIG.IN_PROGRESS.color },
  { id: 'FINISHED',    labelKey: 'kanban.statusFINISHED',    color: '#95a5a6' },
]

export const PREDEFINED_STAGES: { key: string; labelKey: ParseKeys<'common'> }[] = [
  { key: 'stage.hrInterview',        labelKey: 'stage.hrInterview' },
  { key: 'stage.technicalInterview', labelKey: 'stage.technicalInterview' },
  { key: 'stage.managerInterview',   labelKey: 'stage.managerInterview' },
  { key: 'stage.recruitmentTask',    labelKey: 'stage.recruitmentTask' },
  { key: 'stage.finalInterview',     labelKey: 'stage.finalInterview' },
]

// Maps legacy Polish DB values to i18n keys — no DB migration needed
const LEGACY_STAGE_MAP: Record<string, string> = {
  'Rozmowa z HR':         'stage.hrInterview',
  'Rozmowa techniczna':   'stage.technicalInterview',
  'Rozmowa z managerem':  'stage.managerInterview',
  'Zadanie rekrutacyjne': 'stage.recruitmentTask',
  'Rozmowa finalna':      'stage.finalInterview',
}

// Returns display string for any stored value (key, legacy Polish, or custom text)
export const translateStageName = (name: string | null | undefined, t: TFunction): string => {
  if (!name) return ''
  if (name.startsWith('stage.')) return t(name as ParseKeys<'common'>)
  const mappedKey = LEGACY_STAGE_MAP[name]
  if (mappedKey) return t(mappedKey as ParseKeys<'common'>)
  return name // custom stage — show as-is
}

// Returns canonical key for comparisons (active state in dropdown)
export const normalizeStageKey = (name: string | null | undefined): string => {
  if (!name) return ''
  if (name.startsWith('stage.')) return name
  return LEGACY_STAGE_MAP[name] ?? name
}

export const REJECTION_REASONS: { id: string; labelKey: ParseKeys<'common'> }[] = [
  { id: 'NO_RESPONSE',              labelKey: 'kanban.rejectionNoResponse' },
  { id: 'EMAIL_REJECTION',          labelKey: 'kanban.rejectionEmailRejection' },
  { id: 'REJECTED_AFTER_INTERVIEW', labelKey: 'kanban.rejectionAfterInterview' },
  { id: 'OTHER',                    labelKey: 'kanban.rejectionOther' },
]
