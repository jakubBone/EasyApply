import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useApplications,
  useCreateApplication,
} from '../../hooks/useApplications'
import { createTestQueryClient } from '../test-utils'

vi.mock('../../services/api', () => ({
  fetchApplications: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  updateApplicationStatus: vi.fn(),
  updateApplicationStage: vi.fn(),
  deleteApplication: vi.fn(),
  assignCVToApplication: vi.fn(),
}))

import * as api from '../../services/api'

const mockApplications = [
  { id: 1, company: 'Google', position: 'Dev', status: 'SENT' },
  { id: 2, company: 'Meta', position: 'Engineer', status: 'IN_PROGRESS' },
]

// Fresh QueryClient per test. Sharing one would let a cached list from an earlier test
// satisfy a later assertion that should have failed.
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
