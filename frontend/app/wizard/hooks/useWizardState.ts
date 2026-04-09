'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchWizardState, saveWizardState } from '@/lib/api-client'
import type { WizardState, WizardStepId, WizardStepState } from '../types/wizard'

const STEP_IDS: WizardStepId[] = [
  'personal-info',
  'goals',
  'medical-history',
  'lifestyle',
  'diet',
  'family-history',
]

function createInitialState(): WizardState {
  return {
    currentStepIndex: 0,
    steps: Object.fromEntries(
      STEP_IDS.map((id) => [id, { answers: {}, completed: false } satisfies WizardStepState])
    ) as Record<WizardStepId, WizardStepState>,
    startedAt: new Date().toISOString(),
  }
}

export function useWizardState() {
  const [state, setState] = useState<WizardState>(createInitialState)
  const [hydrated, setHydrated] = useState(false)

  // Load from server on mount
  useEffect(() => {
    let isMounted = true
    fetchWizardState().then((raw) => {
      if (!isMounted) return
      if (raw && Object.keys(raw).length > 0) {
        try {
          setState(raw as unknown as WizardState)
        } catch {
          // corrupt — start fresh
        }
      }
      setHydrated(true)
    }).catch(() => {
      if (isMounted) setHydrated(true)
    })
    return () => { isMounted = false }
  }, [])

  // Save to server on every state change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveWizardState(state as unknown as Record<string, unknown>)
    }
  }, [state, hydrated])

  const setStepAnswers = useCallback(
    (stepId: WizardStepId, answers: Record<string, unknown>) => {
      setState((prev) => ({
        ...prev,
        steps: {
          ...prev.steps,
          [stepId]: { ...prev.steps[stepId], answers, savedAt: new Date().toISOString() },
        },
        lastSavedAt: new Date().toISOString(),
      }))
    },
    []
  )

  const markStepCompleted = useCallback((stepId: WizardStepId) => {
    setState((prev) => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepId]: { ...prev.steps[stepId], completed: true, savedAt: new Date().toISOString() },
      },
    }))
  }, [])

  const goToStep = useCallback((index: number) => {
    setState((prev) => ({ ...prev, currentStepIndex: index }))
  }, [])

  const clearProgress = useCallback(() => {
    const fresh = createInitialState()
    setState(fresh)
    saveWizardState(fresh as unknown as Record<string, unknown>)
  }, [])

  return { state, hydrated, setStepAnswers, markStepCompleted, goToStep, clearProgress }
}
