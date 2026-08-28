import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCVs, createCV, updateCV, deleteCV } from '../services/api'
import { applicationKeys } from './useApplications'

export const cvKeys = {
  all: ['cvs'] as const,
}

export function useCVs() {
  return useQuery({
    queryKey: cvKeys.all,
    queryFn: fetchCVs,
  })
}

export function useCreateCV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { originalFileName: string; type: string; externalUrl?: string }) =>
      createCV(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cvKeys.all })
    },
  })
}

export function useUpdateCV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { originalFileName: string; externalUrl?: string } }) =>
      updateCV(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cvKeys.all })
    },
  })
}

export function useDeleteCV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCV(id),
    onSuccess: () => {
      // Deleting a CV may detach it from applications, so refresh both lists
      void queryClient.invalidateQueries({ queryKey: cvKeys.all })
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}
