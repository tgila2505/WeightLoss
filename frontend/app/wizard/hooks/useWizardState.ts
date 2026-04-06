'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WizardState, WizardStepId, WizardStepState } from '../types/wizard'

const STORAGE_KEY = 'wizard_progress'

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

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setState(JSON.parse(raw) as WizardState)
      } catch {
        // Corrupt storage — start fresh
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setHydrated(true)
  }, [])

  // Persist on every state change (after hydration)
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
    localStorage.removeItem(STORAGE_KEY)
    setState(createInitialState())
  }, [])

  return { state, hydrated, setStepAnswers, markStepCompleted, goToStep, clearProgress }
}
