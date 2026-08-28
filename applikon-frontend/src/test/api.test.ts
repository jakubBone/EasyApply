import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchApplications,
  createApplication,
  updateApplicationStatus,
  updateApplicationStage,
  checkDuplicate,
  updateApplication,
  deleteApplication,
  fetchCVs,
  deleteCV,
  assignCVToApplication,
  downloadCV,
  fetchNotes,
  createNote,
  deleteNote,
  fetchBadgeStats,
  getToken,
  setToken,
} from '../services/api'
import type { StageUpdateRequest } from '../types/domain'

const API_URL = 'http://localhost:8080/api'

// Helper: mocks global fetch with ok response
const mockFetch = (body: unknown) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

describe('API Service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  describe('Applications API', () => {
    it('fetchApplications - fetches list of applications', async () => {
      const mockApplications = [
        { id: 1, company: 'Google', position: 'Dev' },
        { id: 2, company: 'Meta', position: 'Engineer' }
      ]
      mockFetch(mockApplications)

      const result = await fetchApplications()

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications`,
        expect.objectContaining({ headers: expect.any(Object) })
      )
      expect(result).toEqual(mockApplications)
    })

    it('fetchApplications - throws error on failed request', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400 })

      await expect(fetchApplications()).rejects.toThrow('api.fetchApplications')
    })

    it('createApplication - creates new application', async () => {
      const newApp = { company: 'Google', position: 'Dev', salaryMin: 8000 }
      const createdApp = { id: 1, ...newApp, status: 'WYSLANE' }
      mockFetch(createdApp)

      const result = await createApplication(newApp)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newApp),
        })
      )
      expect(result).toEqual(createdApp)
    })

    it('updateApplicationStatus - changes application status', async () => {
      const updatedApp = { id: 1, status: 'W_PROCESIE' }
      mockFetch(updatedApp)

      const result = await updateApplicationStatus(1, 'W_PROCESIE')

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications/1/status`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'W_PROCESIE' }),
        })
      )
      expect(result).toEqual(updatedApp)
    })

    it('updateApplicationStage - changes application stage', async () => {
      const stageData: StageUpdateRequest = { status: 'W_PROCESIE', currentStage: 'Rozmowa z HR' }
      const updatedApp = { id: 1, currentStage: 'Rozmowa z HR' }
      mockFetch(updatedApp)

      const result = await updateApplicationStage(1, stageData)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications/1/stage`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(stageData),
        })
      )
      expect(result).toEqual(updatedApp)
    })

    it('checkDuplicate - checks duplicates', async () => {
      const duplicates = [{ id: 1, company: 'Google', position: 'Dev' }]
      mockFetch(duplicates)

      const result = await checkDuplicate('Google', 'Dev')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('check-duplicate?company=Google&position=Dev'),
        expect.objectContaining({ headers: expect.any(Object) })
      )
      expect(result).toEqual(duplicates)
    })

    it('updateApplication - updates application', async () => {
      const updateData = { company: 'Google Updated', position: 'Senior Dev' }
      const updatedApp = { id: 1, ...updateData }
      mockFetch(updatedApp)

      const result = await updateApplication(1, updateData)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications/1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      )
      expect(result).toEqual(updatedApp)
    })

    it('deleteApplication - deletes application', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      await deleteApplication(1)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications/1`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('CV API', () => {
    it('fetchCVs - fetches list of CVs', async () => {
      const mockCVs = [
        { id: 1, originalFileName: 'CV1.pdf', type: 'FILE' },
        { id: 2, originalFileName: 'CV2.pdf', type: 'LINK' }
      ]
      mockFetch(mockCVs)

      const result = await fetchCVs()

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/cv`,
        expect.objectContaining({ headers: expect.any(Object) })
      )
      expect(result).toEqual(mockCVs)
    })

    it('deleteCV - deletes CV', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      await deleteCV(1)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/cv/1`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('assignCVToApplication - assigns CV to application', async () => {
      const updatedApp = { id: 1, cvId: 5 }
      mockFetch(updatedApp)

      const result = await assignCVToApplication(1, 5)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications/1/cv`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ cvId: 5 }),
        })
      )
      expect(result).toEqual(updatedApp)
    })

    it('downloadCV - calls fetch with correct endpoint and token', async () => {
      const mockBlob = new Blob(['file content'], { type: 'application/pdf' })
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      })

      // Mock URL.createObjectURL because jsdom doesn't support it
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
      const mockRevokeObjectURL = vi.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      await downloadCV(123, 'CV_Test.pdf')

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/cv/123/download`,
        expect.objectContaining({ headers: expect.anything() })
      )
    })
  })

  describe('Notes API', () => {
    it('fetchNotes - fetches notes for application', async () => {
      const mockNotes = [
        { id: 1, content: 'Notatka 1', category: 'PYTANIA' },
        { id: 2, content: 'Notatka 2', category: 'FEEDBACK' }
      ]
      mockFetch(mockNotes)

      const result = await fetchNotes(1)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications/1/notes`,
        expect.objectContaining({ headers: expect.any(Object) })
      )
      expect(result).toEqual(mockNotes)
    })

    it('createNote - creates new note', async () => {
      const createdNote = { id: 1, content: 'Test', category: 'INNE' }
      mockFetch(createdNote)

      const result = await createNote(1, 'Test')

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/applications/1/notes`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Test', category: null }),
        })
      )
      expect(result).toEqual(createdNote)
    })

    it('deleteNote - deletes note', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      await deleteNote(1)

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/notes/1`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Statistics API', () => {
    it('fetchBadgeStats - fetches badge statistics', async () => {
      const mockStats = {
        rejectionCount: 5,
        ghostingCount: 3,
        offerCount: 1,
        hasSpecialBadge: false,
        rejectionBadge: { level: 'BRONZE', label: 'Rękawica', icon: '🥊' },
        ghostingBadge: null,
      }
      mockFetch(mockStats)

      const result = await fetchBadgeStats()

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/statistics/badges`,
        expect.objectContaining({ headers: expect.any(Object) })
      )
      expect(result).toEqual(mockStats)
    })

    it('fetchBadgeStats - throws error on failed request', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

      await expect(fetchBadgeStats()).rejects.toThrow('api.fetchStats')
    })
  })

  // apiFetch: the refresh flow

  describe('apiFetch refresh flow', () => {
    it('retries with the new token after a 401, then succeeds', async () => {
      setToken('old-token')
      const applications = [{ id: 1, company: 'Google', position: 'Dev' }]

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 401 }) // original request
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ accessToken: 'new-token' }) }) // /auth/refresh
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(applications) }) // retried request

      const result = await fetchApplications()

      expect(result).toEqual(applications)
      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `${API_URL}/auth/refresh`,
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      )
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        `${API_URL}/applications`,
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer new-token' }) })
      )
      expect(getToken()).toBe('new-token')
    })

    it('clears the token and stops when the refresh call itself fails', async () => {
      setToken('old-token')

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 401 }) // original request
        .mockResolvedValueOnce({ ok: false, status: 401 }) // /auth/refresh — no valid refresh cookie

      await expect(fetchApplications()).rejects.toThrow('Unauthorized')

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(getToken()).toBeNull()
    })

    it('clears the token and stops when the retried request is still a 401', async () => {
      setToken('old-token')

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 401 }) // original request
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ accessToken: 'new-token' }) }) // /auth/refresh
        .mockResolvedValueOnce({ ok: false, status: 401 }) // retried request — still unauthorized

      await expect(fetchApplications()).rejects.toThrow('Unauthorized')

      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(getToken()).toBeNull()
    })

    it('shares one refresh call across two requests that 401 concurrently', async () => {
      setToken('old-token')
      const applications = [{ id: 1, company: 'Google', position: 'Dev' }]
      const cvs = [{ id: 1, originalFileName: 'cv.pdf', type: 'FILE' }]

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url === `${API_URL}/auth/refresh`) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ accessToken: 'new-token' }) })
        }
        const token = getToken()
        if (token !== 'new-token') {
          return Promise.resolve({ ok: false, status: 401 })
        }
        const body = url === `${API_URL}/applications` ? applications : cvs
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
      })

      const [appsResult, cvsResult] = await Promise.all([fetchApplications(), fetchCVs()])

      expect(appsResult).toEqual(applications)
      expect(cvsResult).toEqual(cvs)
      const refreshCalls = vi.mocked(global.fetch).mock.calls.filter(([url]) => url === `${API_URL}/auth/refresh`)
      expect(refreshCalls).toHaveLength(1)
    })
  })
})
