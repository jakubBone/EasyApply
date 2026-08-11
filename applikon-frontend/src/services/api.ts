import type {
  Application,
  ApplicationRequest,
  BadgeStats,
  BriefFieldEdit,
  BriefResponse,
  CV,
  Note,
  NoteCategory,
  ScreeningAnswer,
  ScreeningAnswerRequest,
  ServiceNotice,
  StageUpdateRequest,
  User,
} from '../types/domain'
import i18n from '../i18n'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const TOKEN_KEY = 'applikon_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)

/**
 * Builds HTTP headers for each request.
 * JWT access token is sent in the Authorization: Bearer header.
 * Refresh token is in an httpOnly cookie — the browser sends it automatically.
 */
const getHeaders = (contentType?: string): HeadersInit => {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (contentType) {
    headers['Content-Type'] = contentType
  }
  headers['Accept-Language'] = i18n.language
  return headers
}

// Concurrent 401s share one in-flight refresh instead of each calling /auth/refresh.
let refreshingPromise: Promise<string> | null = null

const refreshAccessToken = (): Promise<string> => {
  if (!refreshingPromise) {
    refreshingPromise = refreshToken().finally(() => {
      refreshingPromise = null
    })
  }
  return refreshingPromise
}

/**
 * Performs a fetch. On 401, tries a silent refresh (via the httpOnly refresh-token
 * cookie) and retries the request once with the new access token. If the refresh
 * fails too — or the retried request still gets a 401 — clears the token and
 * sends the user to log in again.
 */
const apiFetch = async (input: string, init?: RequestInit, isRetry = false): Promise<Response> => {
  const response = await fetch(input, init)
  if (response.status !== 401) return response

  if (!isRetry) {
    try {
      const newToken = await refreshAccessToken()
      return apiFetch(input, {
        ...init,
        headers: {
          ...(init?.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${newToken}`,
        },
      }, true)
    } catch {
      // Refresh failed (no valid refresh-token cookie) — fall through to logout.
    }
  }

  clearToken()
  window.location.href = '/login'
  throw new Error('Unauthorized')
}

// ============================================================
// Auth
// ============================================================

export const fetchCurrentUser = async (): Promise<User> => {
  const response = await apiFetch(`${API_URL}/auth/me`, { headers: getHeaders() })
  if (!response.ok) throw new Error('api.fetchCurrentUser')
  return response.json() as Promise<User>
}

export const logout = async (): Promise<void> => {
  await apiFetch(`${API_URL}/auth/logout`, { method: 'POST', headers: getHeaders() })
  clearToken()
}

export const refreshToken = async (): Promise<string> => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error('api.sessionExpired')
  const data = await response.json() as { accessToken: string }
  setToken(data.accessToken)
  return data.accessToken
}

export const acceptConsent = async (): Promise<void> => {
  const response = await apiFetch(`${API_URL}/auth/consent`, {
    method: 'POST',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.acceptConsent')
}

export const deleteAccount = async (): Promise<void> => {
  const response = await apiFetch(`${API_URL}/auth/me`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.deleteAccount')
  clearToken()
}

// ============================================================
// Applications
// ============================================================

export const fetchApplications = async (): Promise<Application[]> => {
  const response = await apiFetch(`${API_URL}/applications`, { headers: getHeaders() })
  if (!response.ok) throw new Error('api.fetchApplications')
  return response.json() as Promise<Application[]>
}

export const createApplication = async (data: ApplicationRequest): Promise<Application> => {
  const response = await apiFetch(`${API_URL}/applications`, {
    method: 'POST',
    headers: getHeaders('application/json'),
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('api.createApplication')
  return response.json() as Promise<Application>
}

export const updateApplication = async (id: number, data: ApplicationRequest): Promise<Application> => {
  const response = await apiFetch(`${API_URL}/applications/${id}`, {
    method: 'PUT',
    headers: getHeaders('application/json'),
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('api.updateApplication')
  return response.json() as Promise<Application>
}

export const deleteApplication = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_URL}/applications/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.deleteApplication')
}

export const updateApplicationStatus = async (id: number, status: string): Promise<Application> => {
  const response = await apiFetch(`${API_URL}/applications/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ status }),
  })
  if (!response.ok) throw new Error('api.updateStatus')
  return response.json() as Promise<Application>
}

export const updateApplicationStage = async (id: number, data: StageUpdateRequest): Promise<Application> => {
  const response = await apiFetch(`${API_URL}/applications/${id}/stage`, {
    method: 'PATCH',
    headers: getHeaders('application/json'),
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('api.updateStage')
  return response.json() as Promise<Application>
}

export const fetchApplicationScreeningAnswers = async (applicationId: number): Promise<ScreeningAnswer[]> => {
  const response = await apiFetch(`${API_URL}/applications/${applicationId}/screening-answers`, { headers: getHeaders() })
  if (!response.ok) throw new Error('api.fetchApplicationScreeningAnswers')
  return response.json() as Promise<ScreeningAnswer[]>
}

export const saveApplicationScreeningAnswers = async (
  applicationId: number,
  answers: ScreeningAnswerRequest[],
): Promise<ScreeningAnswer[]> => {
  const response = await apiFetch(`${API_URL}/applications/${applicationId}/screening-answers`, {
    method: 'PUT',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ answers }),
  })
  if (!response.ok) throw new Error('api.saveApplicationScreeningAnswers')
  return response.json() as Promise<ScreeningAnswer[]>
}

// ============================================================
// Company brief (AI)
// ============================================================

/** Starts generation (or returns the cached brief). Always 202 — the body carries the status. */
export const triggerBrief = async (applicationId: number): Promise<BriefResponse> => {
  const response = await apiFetch(`${API_URL}/applications/${applicationId}/brief`, {
    method: 'POST',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.triggerBrief')
  return response.json() as Promise<BriefResponse>
}

/** The application's company brief, or `null` when none was ever generated (backend answers 404). */
export const fetchBrief = async (applicationId: number): Promise<BriefResponse | null> => {
  const response = await apiFetch(`${API_URL}/applications/${applicationId}/brief`, { headers: getHeaders() })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('api.fetchBrief')
  return response.json() as Promise<BriefResponse>
}

/** Writes the user's own text to the company's brief — every locale, on every application to it. */
export const editBrief = async (applicationId: number, fields: BriefFieldEdit[]): Promise<void> => {
  const response = await apiFetch(`${API_URL}/applications/${applicationId}/brief`, {
    method: 'PUT',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) throw new Error('api.editBrief')
}

export const checkDuplicate = async (company: string, position: string): Promise<Application[]> => {
  const params = new URLSearchParams({ company, position })
  const response = await apiFetch(`${API_URL}/applications/check-duplicate?${params}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.checkDuplicate')
  return response.json() as Promise<Application[]>
}

// ============================================================
// CV
// ============================================================

export const fetchCVs = async (): Promise<CV[]> => {
  const response = await apiFetch(`${API_URL}/cv`, { headers: getHeaders() })
  if (!response.ok) throw new Error('api.fetchCVs')
  return response.json() as Promise<CV[]>
}

export const createCV = async (data: { originalFileName: string; type: string; externalUrl?: string }): Promise<CV> => {
  const response = await apiFetch(`${API_URL}/cv`, {
    method: 'POST',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ name: data.originalFileName, type: data.type, externalUrl: data.externalUrl }),
  })
  if (!response.ok) throw new Error('api.createCV')
  return response.json() as Promise<CV>
}

export const updateCV = async (id: number, data: { originalFileName: string; externalUrl?: string }): Promise<CV> => {
  const response = await apiFetch(`${API_URL}/cv/${id}`, {
    method: 'PUT',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ name: data.originalFileName, externalUrl: data.externalUrl }),
  })
  if (!response.ok) throw new Error('api.updateCV')
  return response.json() as Promise<CV>
}

export const deleteCV = async (id: number): Promise<void> => {
  const response = await apiFetch(`${API_URL}/cv/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.deleteCV')
}

export const assignCVToApplication = async (applicationId: number, cvId: number | null): Promise<Application> => {
  const response = await apiFetch(`${API_URL}/applications/${applicationId}/cv`, {
    method: 'PATCH',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ cvId }),
  })
  if (!response.ok) throw new Error('api.assignCV')
  return response.json() as Promise<Application>
}

export const downloadCV = async (id: number, fileName: string): Promise<void> => {
  const response = await apiFetch(`${API_URL}/cv/${id}/download`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.downloadCV')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Notes
// ============================================================

export const fetchNotes = async (applicationId: number): Promise<Note[]> => {
  const response = await apiFetch(`${API_URL}/applications/${applicationId}/notes`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.fetchNotes')
  return response.json() as Promise<Note[]>
}

export const createNote = async (applicationId: number, content: string, category: NoteCategory | null = null): Promise<Note> => {
  const response = await apiFetch(`${API_URL}/applications/${applicationId}/notes`, {
    method: 'POST',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ content, category }),
  })
  if (!response.ok) throw new Error('api.createNote')
  return response.json() as Promise<Note>
}

export const updateNote = async (noteId: number, content: string, category: NoteCategory | null = null): Promise<Note> => {
  const response = await apiFetch(`${API_URL}/notes/${noteId}`, {
    method: 'PUT',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ content, category }),
  })
  if (!response.ok) throw new Error('api.updateNote')
  return response.json() as Promise<Note>
}

export const deleteNote = async (noteId: number): Promise<void> => {
  const response = await apiFetch(`${API_URL}/notes/${noteId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('api.deleteNote')
}

// ============================================================
// Statistics
// ============================================================

export const fetchBadgeStats = async (): Promise<BadgeStats> => {
  const response = await apiFetch(`${API_URL}/statistics/badges`, { headers: getHeaders() })
  if (!response.ok) throw new Error('api.fetchStats')
  return response.json() as Promise<BadgeStats>
}

// ============================================================
// Service notices
// ============================================================

export const fetchActiveNotices = async (): Promise<ServiceNotice[]> => {
  const response = await apiFetch(`${API_URL}/system/notices/active`, { headers: getHeaders() })
  if (!response.ok) return []
  return response.json() as Promise<ServiceNotice[]>
}

// ============================================================
// Screening answers ("My answers")
// ============================================================

export const fetchScreeningAnswers = async (): Promise<ScreeningAnswer[]> => {
  const response = await apiFetch(`${API_URL}/screening-answers`, { headers: getHeaders() })
  if (!response.ok) throw new Error('api.fetchScreeningAnswers')
  return response.json() as Promise<ScreeningAnswer[]>
}

export const saveScreeningAnswers = async (answers: ScreeningAnswerRequest[]): Promise<ScreeningAnswer[]> => {
  const response = await apiFetch(`${API_URL}/screening-answers`, {
    method: 'PUT',
    headers: getHeaders('application/json'),
    body: JSON.stringify({ answers }),
  })
  if (!response.ok) throw new Error('api.saveScreeningAnswers')
  return response.json() as Promise<ScreeningAnswer[]>
}

// ============================================================
// User data export
// ============================================================

export const exportMyData = async (): Promise<void> => {
  const response = await apiFetch(`${API_URL}/auth/me/export`, { headers: getHeaders() })
  if (!response.ok) throw new Error('api.exportMyData')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'applikon-export.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
