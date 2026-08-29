import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteBrief, editBrief, fetchBrief, triggerBrief } from '../services/api'
import type { BriefFieldEdit, BriefResponse } from '../types/domain'

export const briefKeys = {
  byApp: (applicationId: number) => ['brief', applicationId] as const,
}

// How often to re-check a brief that is still generating.
const POLL_INTERVAL_MS = 2000

// useBrief: the application's company brief. `null` data means no brief was ever
// generated for this company (the section then offers the generate button).
// Polls only while the status is PENDING; a terminal status stops it, as does unmount.
export function useBrief(applicationId: number | null) {
  return useQuery({
    queryKey: briefKeys.byApp(applicationId ?? 0),
    queryFn: () => fetchBrief(applicationId as number),
    enabled: applicationId != null,
    refetchInterval: query => (query.state.data?.status === 'PENDING' ? POLL_INTERVAL_MS : false),
  })
}

// useGenerateBrief: the user's explicit "generate" click (POST). The response already
// carries the status, so it seeds the cache and polling starts from PENDING without
// waiting for the next fetch.
export function useGenerateBrief(applicationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => triggerBrief(applicationId),
    onSuccess: brief => {
      queryClient.setQueryData<BriefResponse | null>(briefKeys.byApp(applicationId), brief)
    },
  })
}

// useEditBrief: saves the user's own text (PUT). The edit lands on the company's brief,
// so every application's copy is refetched.
export function useEditBrief(applicationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: BriefFieldEdit[]) => editBrief(applicationId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief'] })
    },
  })
}

// useDeleteBrief: removes the company's brief (DELETE). Like the edit, it affects every
// application to the company, so all copies are refetched. Regenerating afterwards is how
// a stale brief gets refreshed.
export function useDeleteBrief(applicationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteBrief(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief'] })
    },
  })
}
