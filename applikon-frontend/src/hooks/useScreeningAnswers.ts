import { useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchScreeningAnswers,
  saveScreeningAnswers,
  fetchApplicationScreeningAnswers,
  saveApplicationScreeningAnswers,
} from '../services/api'
import type { ScreeningAnswer, ScreeningAnswerRequest } from '../types/domain'

export const screeningAnswerKeys = {
  all: ['screening-answers'] as const,
}

export const applicationScreeningAnswerKeys = {
  byApp: (applicationId: number) => ['application-screening-answers', applicationId] as const,
}

// Collapse rapid keystrokes into a single PUT.
const AUTOSAVE_DELAY_MS = 800

// useScreeningAnswers: fetches the current user's "My answers" set (ordered).
export function useScreeningAnswers() {
  return useQuery({
    queryKey: screeningAnswerKeys.all,
    queryFn: fetchScreeningAnswers,
  })
}

// useSaveScreeningAnswers: replace-all save (PUT) with a debounced variant for
// autosave on edit. `saveDebounced` schedules the save; calling it again before
// the delay elapses resets the timer so only the latest set is sent.
export function useSaveScreeningAnswers() {
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const mutation = useMutation({
    mutationFn: (answers: ScreeningAnswerRequest[]) => saveScreeningAnswers(answers),
    onSuccess: (saved) => {
      queryClient.setQueryData<ScreeningAnswer[]>(screeningAnswerKeys.all, saved)
    },
  })

  const { mutate } = mutation
  const saveDebounced = useCallback((answers: ScreeningAnswerRequest[]) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => mutate(answers), AUTOSAVE_DELAY_MS)
  }, [mutate])

  return { ...mutation, saveDebounced }
}

// useApplicationScreeningAnswers: the per-application "About the company" answer set
// (ordered). Disabled until an application id is available.
export function useApplicationScreeningAnswers(applicationId: number | null) {
  return useQuery({
    queryKey: applicationScreeningAnswerKeys.byApp(applicationId ?? 0),
    queryFn: () => fetchApplicationScreeningAnswers(applicationId as number),
    enabled: applicationId != null,
  })
}

// useSaveApplicationScreeningAnswers: replace-all save (PUT) for one application's
// "About the company" answers.
export function useSaveApplicationScreeningAnswers(applicationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (answers: ScreeningAnswerRequest[]) => saveApplicationScreeningAnswers(applicationId, answers),
    onSuccess: (saved) => {
      queryClient.setQueryData<ScreeningAnswer[]>(applicationScreeningAnswerKeys.byApp(applicationId), saved)
    },
  })
}
