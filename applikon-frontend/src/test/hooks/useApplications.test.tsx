import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useApplications,
  useCreateApplication,
  useCheckDuplicate,
} from '../../hooks/useApplications'
import { createTestQueryClient } from '../test-utils'

vi.mock('../../services/api', () => ({
  fetchApplications: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  updateApplicationStatus: vi.fn(),
  updateApplicationStage: vi.fn(),
  deleteApplication: vi.fn(),
  checkDuplicate: vi.fn(),
  assignCVToApplication: vi.fn(),
}))

import * as api from '../../services/api'

const mockApplications = [
  { id: 1, company: 'Google', position: 'Dev', status: 'SENT' },
  { id: 2, company: 'Meta', position: 'Engineer', status: 'IN_PROGRESS' },
]

/**
 * Create a fresh QueryClient for each test via factory.
 * If we used one client, cache from one test would poison the next.
 */
function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useApplications', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('fetches and returns list of applications', async () => {
    vi.mocked(api.fetchApplications).mockResolvedValue(mockApplications as any)

    const { result } = renderHook(() => useApplications(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockApplications)
    expect(api.fetchApplications).toHaveBeenCalledOnce()
  })

  it('sets isError when server returns error', async () => {
    vi.mocked(api.fetchApplications).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useApplications(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useCreateApplication', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('calls createApplication with provided data', async () => {
    const newApp = { id: 3, company: 'Apple', position: 'iOS Dev', status: 'SENT' }
    vi.mocked(api.fetchApplications).mockResolvedValue([])
    vi.mocked(api.createApplication).mockResolvedValue(newApp as any)

    const { result } = renderHook(() => useCreateApplication(), { wrapper: createWrapper() })

    result.current.mutate({ company: 'Apple', position: 'iOS Dev' } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.createApplication).toHaveBeenCalledWith({
      company: 'Apple',
      position: 'iOS Dev',
    })
  })
})

describe('useCheckDuplicate', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('does not send query when company is empty', () => {
    vi.mocked(api.checkDuplicate).mockResolvedValue([])

    const { result } = renderHook(
      () => useCheckDuplicate('', 'Dev'),
      { wrapper: createWrapper() }
    )

    // fetchStatus: 'idle' means the query is disabled (enabled: false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(api.checkDuplicate).not.toHaveBeenCalled()
  })

  it('does not send query when position is empty', () => {
    vi.mocked(api.checkDuplicate).mockResolvedValue([])

    const { result } = renderHook(
      () => useCheckDuplicate('Google', ''),
      { wrapper: createWrapper() }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(api.checkDuplicate).not.toHaveBeenCalled()
  })

  it('sends query when both fields are filled', async () => {
    vi.mocked(api.checkDuplicate).mockResolvedValue([])

    const { result } = renderHook(
      () => useCheckDuplicate('Google', 'Dev'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.checkDuplicate).toHaveBeenCalledWith('Google', 'Dev')
  })

  it('returns duplicates when company and position already exists', async () => {
    const duplicate = [{ id: 1, company: 'Google', position: 'Dev', status: 'SENT' }]
    vi.mocked(api.checkDuplicate).mockResolvedValue(duplicate as any)

    const { result } = renderHook(
      () => useCheckDuplicate('Google', 'Dev'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(duplicate)
  })
})
