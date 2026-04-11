'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WizardState, WizardStepId, WizardStepState } from '../types/wizard'

const WIZARD_STORAGE_KEY = 'wizard_progress'

function loadWizardState(): WizardState | null {
  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WizardState
  } catch {
    return null
  }
}

function persistWizardState(state: WizardState): void {
  window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state))
}

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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadWizardState()
    if (saved && Object.keys(saved).length > 0) {
      setState(saved)
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage on every state change (after hydration)
  useEffect(() => {
    if (hydrated) {
      persistWizardState(state)
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
    persistWizardState(fresh)
  }, [])

  /**
   * Seeds wizard answers from a previously saved profile (DB data).
   * Only applies when all steps are empty — won't overwrite in-progress work.
   */
  const seedFromProfile = useCallback(
    (profileAnswers: Partial<Record<WizardStepId, Record<string, unknown>>>) => {
      setState((prev) => {
        const hasProgress = Object.values(prev.steps).some(
          (s) => Object.keys(s.answers).length > 0,
        )
        if (hasProgress) return prev

        return {
          ...prev,
          steps: Object.fromEntries(
            STEP_IDS.map((id) => [
              id,
              {
                answers: profileAnswers[id] ?? {},
                completed: Boolean(
                  profileAnswers[id] && Object.keys(profileAnswers[id]).length > 0,
                ),
              } satisfies WizardStepState,
            ]),
          ) as Record<WizardStepId, WizardStepState>,
        }
      })
    },
    [],
  )

  return { state, hydrated, setStepAnswers, markStepCompleted, goToStep, clearProgress, seedFromProfile }
}
