import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchApplications,
  createApplication,
  updateApplication,
  updateApplicationStatus,
  updateApplicationStage,
  deleteApplication,
  assignCVToApplication,
} from '../services/api'
import type { Application, ApplicationRequest, StageUpdateRequest } from '../types/domain'

// Query keys — central location, eliminates typos when invalidating cache
export const applicationKeys = {
  all: ['applications'] as const,
}

/**
 * useApplications — fetches list of all user applications.
 *
 * useQuery automatically:
 * - manages loading/error/data state
 * - caches results (staleTime from QueryClient)
 * - refreshes data on tab return (refetchOnWindowFocus)
 */
export function useApplications() {
  return useQuery({
    queryKey: applicationKeys.all,
    queryFn: fetchApplications,
  })
}

/**
 * useCreateApplication — creates a new application.
 *
 * useMutation:
 * - onSuccess: invalidates application cache → React Query automatically
 *   refetches the list, view updates without manual setState
 */
export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ApplicationRequest) => createApplication(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApplicationRequest }) =>
      updateApplication(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}

export function useUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateApplicationStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['badgeStats'] })
    },
  })
}

export function useUpdateStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: StageUpdateRequest }) =>
      updateApplicationStage(id, data),
    // Optimistic update — move the card immediately instead of waiting for the
    // server round-trip + refetch, which felt laggy on the deployed backend.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.all })
      const previous = queryClient.getQueryData<Application[]>(applicationKeys.all)
      queryClient.setQueryData<Application[]>(applicationKeys.all, (old) =>
        // Cast: StageUpdateRequest types are wider/nullable vs Application;
        // the onSettled refetch reconciles against the authoritative shape.
        old?.map(app => (app.id === id ? ({ ...app, ...data } as Application) : app))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(applicationKeys.all, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['badgeStats'] })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}

export function useAssignCV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ applicationId, cvId }: { applicationId: number; cvId: number | null }) =>
      assignCVToApplication(applicationId, cvId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}

