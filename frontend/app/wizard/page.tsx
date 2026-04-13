'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchProfile, upsertProfile, saveNodeAnswers } from '@/lib/api-client'
import { WizardShell, WIZARD_STEPS } from './components/wizard-shell'
import { useWizardState } from './hooks/useWizardState'
import { mapWizardToProfilePayload, mapStepToNodeAnswers, mapProfileToWizardAnswers } from './utils/profile-mapper'
import { trackEvent } from '@/lib/analytics'
import { resolveUXMode } from '@/lib/ux-mode'
import type { WizardStepId } from './types/wizard'
import type { MindMapAnswerValue } from '@/lib/api-client'

export default function WizardPage() {
  return (
    <Suspense>
      <WizardContent />
    </Suspense>
  )
}

function WizardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, hydrated, setStepAnswers, markStepCompleted, goToStep, clearProgress, seedFromProfile } =
    useWizardState()
  const [userId, setUserId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const startedAtRef = useRef<number>(Date.now())

  // Gate: redirect to mindmap if wizard is not the resolved mode
  useEffect(() => {
    if (!hydrated) return
    async function checkMode() {
      const profile = await fetchProfile()
      const id = profile?.user_id ?? null
      setUserId(id)
      const urlOverride = searchParams.get('ux')
      const resolution = resolveUXMode(id, urlOverride)
      if (resolution.mode !== 'wizard') {
        router.replace('/mindmap')
        return
      }
      // Pre-fill from DB if user has a saved profile and no in-progress local work
      if (profile) {
        seedFromProfile(mapProfileToWizardAnswers(profile))
      }

      // Track start event only on fresh session (no prior progress)
      if (!state.lastSavedAt) {
        trackEvent('profile_questionnaire_started', {
          userId: id ?? undefined,
          uxMode: 'wizard',
          source: resolution.source,
        })
      }
    }
    checkMode()
  }, [hydrated])

  async function handleNext(stepId: WizardStepId) {
    setIsSaving(true)
    const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === stepId)
    const stepAnswers = state.steps[stepId].answers

    try {
      // Persist questionnaire node answers for this step
      const nodeAnswers = mapStepToNodeAnswers(stepId, stepAnswers)
      await Promise.all(
        Object.entries(nodeAnswers).map(([nodeId, answers]) =>
          saveNodeAnswers(nodeId, answers as Record<string, MindMapAnswerValue>)
        )
      )

      // On last step — also persist flat profile fields
      const isLastStep = stepIndex === WIZARD_STEPS.length - 1
      if (isLastStep) {
        const profilePayload = mapWizardToProfilePayload(
          Object.fromEntries(
            Object.entries(state.steps).map(([k, v]) => [k, v.answers])
          ) as Parameters<typeof mapWizardToProfilePayload>[0]
        )
        await upsertProfile(profilePayload)
      }

      markStepCompleted(stepId)

      trackEvent('wizard_step_completed', {
        userId: userId ?? undefined,
        uxMode: 'wizard',
        stepId,
        stepIndex,
        timeOnStepMs: Date.now() - startedAtRef.current,
      })

      startedAtRef.current = Date.now()

      if (isLastStep) {
        trackEvent('wizard_completed', {
          userId: userId ?? undefined,
          uxMode: 'wizard',
          totalSteps: WIZARD_STEPS.length,
        })
        trackEvent('profile_questionnaire_completed', {
          userId: userId ?? undefined,
          uxMode: 'wizard',
        })
        clearProgress()
        router.push('/dashboard')
      } else {
        goToStep(stepIndex + 1)
      }
    } catch (err) {
      console.error('Failed to save wizard step:', err)
    } finally {
      setIsSaving(false)
    }
  }

  function handleBack() {
    if (state.currentStepIndex > 0) {
      goToStep(state.currentStepIndex - 1)
    }
  }

  async function handleBeforeSwitch() {
    // Flush the current step's partial answers before navigating away so no data is lost
    const stepId = WIZARD_STEPS[state.currentStepIndex].id
    const stepAnswers = state.steps[stepId].answers
    const nodeAnswers = mapStepToNodeAnswers(stepId, stepAnswers)
    await Promise.all(
      Object.entries(nodeAnswers).map(([nodeId, answers]) =>
        saveNodeAnswers(nodeId, answers as Record<string, MindMapAnswerValue>)
      )
    )
  }

  async function handleSkip() {
    const stepId = WIZARD_STEPS[state.currentStepIndex].id
    const stepAnswers = state.steps[stepId].answers

    // Persist whatever partial answers exist before advancing so no data is lost
    try {
      const nodeAnswers = mapStepToNodeAnswers(stepId, stepAnswers)
      await Promise.all(
        Object.entries(nodeAnswers).map(([nodeId, answers]) =>
          saveNodeAnswers(nodeId, answers as Record<string, MindMapAnswerValue>)
        )
      )
    } catch (err) {
      console.error('Failed to persist partial answers on skip:', err)
    }

    trackEvent('wizard_step_dropped', {
      userId: userId ?? undefined,
      uxMode: 'wizard',
      stepId,
      reason: 'skipped',
    })
    goToStep(state.currentStepIndex + 1)
  }

  if (!hydrated) return null

  return (
    <WizardShell
      currentStepIndex={state.currentStepIndex}
      steps={state.steps}
      onStepAnswersChange={setStepAnswers}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
      isSaving={isSaving}
      userId={userId ?? undefined}
      onBeforeSwitch={handleBeforeSwitch}
    />
  )
}
