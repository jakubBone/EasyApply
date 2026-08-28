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

// One key for the whole list. Every mutation invalidates it, so a typo in a literal key string
// cannot silently leave a stale view behind.
export const applicationKeys = {
  all: ['applications'] as const,
}

export function useApplications() {
  return useQuery({
    queryKey: applicationKeys.all,
    queryFn: fetchApplications,
  })
}

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
    // Kanban drags have to look instant. Waiting for the round trip and the refetch read as lag
    // on the deployed backend, so the card moves first and the server confirms after.
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.all })
      const previous = queryClient.getQueryData<Application[]>(applicationKeys.all)
      queryClient.setQueryData<Application[]>(applicationKeys.all, (old) =>
        // StageUpdateRequest is wider and more nullable than Application, so this shape is a guess
        // at what the server will store. The onSettled refetch replaces it with the real answer.
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

