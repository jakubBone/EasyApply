// Hand-written mirrors of the backend response shapes. Nothing generates these, so a backend
// field rename shows up as a type error here only if this file is updated alongside it.

export type ApplicationStatus = 'SENT' | 'IN_PROGRESS' | 'OFFER' | 'REJECTED'

export type ContractType = 'B2B' | 'EMPLOYMENT' | 'MANDATE' | 'OTHER'

export type SalaryType = 'GROSS' | 'NET'

export type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP'

export type RejectionReason = 'NO_RESPONSE' | 'EMAIL_REJECTION' | 'REJECTED_AFTER_INTERVIEW' | 'OTHER'

export type CVType = 'FILE' | 'LINK' | 'NOTE'

export type NoteCategory = 'QUESTIONS' | 'FEEDBACK' | 'OTHER'

export interface Application {
  id: number
  company: string
  position: string
  status: ApplicationStatus
  currentStage: string | null
  salary: number | null
  salaryMin: number | null
  salaryMax: number | null
  currency: Currency | null
  salaryType: SalaryType | null
  contractType: ContractType | null
  source: string | null
  link: string | null
  jobDescription: string | null
  rejectionReason: RejectionReason | null
  appliedAt: string
  cvId: number | null
  cvFileName: string | null
  cvType: CVType | null
  cvExternalUrl: string | null
}

export interface Note {
  id: number
  content: string
  category: NoteCategory
  applicationId: number
  createdAt: string
}

export interface CV {
  id: number
  fileName: string | null
  originalFileName: string | null
  fileSize: number | null
  uploadedAt: string | null
  type: CVType
  externalUrl: string | null
}

export interface User {
  id: string
  email: string
  name: string
  privacyPolicyAcceptedAt: string | null
}

// Request bodies

export interface ApplicationRequest {
  company: string
  position: string
  salary?: number | null
  salaryMin?: number | null
  salaryMax?: number | null
  currency?: Currency | null
  salaryType?: SalaryType | null
  contractType?: ContractType | null
  source?: string | null
  link?: string | null
  jobDescription?: string | null
}

export interface StageUpdateRequest {
  status?: ApplicationStatus | null
  currentStage?: string | null
  rejectionReason?: string | null
  rejectionDetails?: string | null
}

// Screening answers ("My answers")

// Mirrors ScreeningAnswerResponse.java
export interface ScreeningAnswer {
  id: number
  questionKey: string | null // stable key for fixed questions; null for custom
  label: string | null // shown label for custom questions; null for fixed
  answer: string
  custom: boolean
  sortOrder: number
}

// Mirrors ScreeningAnswerRequest.java; the server assigns sortOrder by position
export interface ScreeningAnswerRequest {
  questionKey: string | null
  label: string | null
  answer: string
  custom: boolean
}

// Company brief (AI)

export type BriefStatus = 'PENDING' | 'READY' | 'FAILED'

// The brief's single field: the "what do you know about the company" pitch.
// Mirrors BriefLocales.FIELD_KEYS.
export const BRIEF_PITCH_KEY = 'pitch'

// Mirrors BriefFieldResponse.java: one text per active locale, null = "not enough public info"
export interface BriefField {
  key: string
  texts: Record<string, string | null>
  edited: boolean
}

// Mirrors BriefResponse.java
export interface BriefResponse {
  status: BriefStatus
  fields: BriefField[]
}

// Mirrors BriefEditRequest.Field: one user text, stored for every locale
export interface BriefFieldEdit {
  fieldKey: string
  text: string
}

// Service notices

export interface ServiceNotice {
  id: number
  type: 'BANNER' | 'MODAL'
  messagePl: string
  messageEn: string
  expiresAt: string | null
}

// Gamification

// Mirrors BadgeResponse.java from the backend
export interface BadgeInfo {
  name: string
  icon: string
  description: string
  threshold: number
  currentCount: number
  nextThreshold: number | null
  nextBadgeName: string | null
}

// Mirrors BadgeStatsResponse.java from the backend
export interface BadgeStats {
  rejectionBadge: BadgeInfo | null
  ghostingBadge: BadgeInfo | null
  totalRejections: number
  totalGhosting: number
  totalOffers: number
  sweetRevengeUnlocked: boolean
}
