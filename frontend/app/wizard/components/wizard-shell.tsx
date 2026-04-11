'use client'

import { type ComponentType, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { WizardStep, WizardStepId, WizardStepState, StepValidationError, StepProps } from '../types/wizard'
import { validateStep } from '../utils/step-validator'
import { UXModeSwitcher } from '@/components/ux-mode-switcher'
import { StepPersonalInfo } from './steps/step-personal'
import { StepGoals } from './steps/step-goals'
import { StepMedicalHistory } from './steps/step-health'
import { StepLifestyle } from './steps/step-lifestyle'
import { StepDiet } from './steps/step-diet'
import { StepFamilyHistory } from './steps/step-family'

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'personal-info', title: 'About You', subtitle: 'Basic personal information', nodeIds: [], optional: false },
  { id: 'goals', title: 'Your Goals', subtitle: 'Weight and health targets', nodeIds: [], optional: false },
  {
    id: 'medical-history',
    title: 'Medical History',
    subtitle: 'Past and current conditions',
    nodeIds: [
      'past-medical-history-cardiovascular',
      'past-medical-history-endocrine',
      'past-medical-history-musculoskeletal',
      'past-medical-history-respiratory',
      'past-medical-history-neurologic',
      'past-medical-history-psychiatric',
      'past-medical-history-gastroenterological',
      'past-medical-history-surgical',
      'past-medical-history-other',
      'regular-medication-each-medicine',
    ],
    optional: false,
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle',
    subtitle: 'Activity, sleep and daily habits',
    nodeIds: [
      'exercise-types', 'exercise-habits',
      'sleep-routine', 'sleep-habits', 'sleep-symptoms-current-state',
      'stress-tolerance-routine', 'stress-tolerance-habits', 'stress-symptoms-current-state',
      'harmful-substance-habits',
      'gut-health-current-state', 'metabolic-flexibility-assessment', 'metabolic-flexibility-habits',
      'aerobics-capacity-current-state', 'inflammation-current-state',
      'mental-health-current-state', 'social-history-current-state',
      'relationships-quality', 'relationships-habits',
      'change-readiness-readiness', 'purpose-clarity-of-vision', 'purpose-assessment',
    ],
    optional: false,
  },
  {
    id: 'diet',
    title: 'Diet & Nutrition',
    subtitle: 'Food preferences and restrictions',
    nodeIds: ['nutrition-groups', 'nutrition-habits'],
    optional: false,
  },
  {
    id: 'family-history',
    title: 'Family History',
    subtitle: 'Optional background',
    nodeIds: ['family-history-relative'],
    optional: true,
  },
]

const STEP_COMPONENTS: Record<WizardStepId, ComponentType<StepProps>> = {
  'personal-info': StepPersonalInfo,
  'goals': StepGoals,
  'medical-history': StepMedicalHistory,
  'lifestyle': StepLifestyle,
  'diet': StepDiet,
  'family-history': StepFamilyHistory,
}

interface WizardShellProps {
  currentStepIndex: number
  steps: Record<WizardStepId, WizardStepState>
  onStepAnswersChange: (stepId: WizardStepId, answers: Record<string, unknown>) => void
  onNext: (stepId: WizardStepId) => Promise<void>
  onBack: () => void
  onSkip: () => void
  isSaving: boolean
  userId?: number
  onBeforeSwitch: () => Promise<void>
}

export function WizardShell({
  currentStepIndex,
  steps,
  onStepAnswersChange,
  onNext,
  onBack,
  onSkip,
  isSaving,
  userId,
  onBeforeSwitch,
}: WizardShellProps) {
  const [errors, setErrors] = useState<StepValidationError[]>([])

  const step = WIZARD_STEPS[currentStepIndex]
  const StepComponent = STEP_COMPONENTS[step.id]
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1
  const progressPct = Math.round(((currentStepIndex + 1) / WIZARD_STEPS.length) * 100)

  async function handleNext() {
    const stepErrors = validateStep(step.id, steps[step.id].answers)
    if (stepErrors.length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors([])
    await onNext(step.id)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {currentStepIndex + 1} of {WIZARD_STEPS.length}</span>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">{progressPct}% complete</span>
              <UXModeSwitcher
                currentMode="wizard"
                userId={userId}
                stepId={step.id}
                stepIndex={currentStepIndex}
                onBeforeSwitch={onBeforeSwitch}
                variant="segmented"
              />
            </div>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div>
            <h1 className="text-xl font-semibold">{step.title}</h1>
            <p className="text-sm text-muted-foreground">{step.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Step tabs */}
      <div className="border-b px-6 py-2 hidden md:block">
        <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto">
          {WIZARD_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`whitespace-nowrap text-xs px-3 py-1 rounded-full border transition-colors ${
                i === currentStepIndex
                  ? 'bg-primary text-primary-foreground border-primary'
                  : steps[s.id].completed
                  ? 'bg-muted text-muted-foreground border-muted'
                  : 'text-muted-foreground border-transparent opacity-40'
              }`}
            >
              {s.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <StepComponent
            answers={steps[step.id].answers}
            onAnswersChange={(answers) => onStepAnswersChange(step.id, answers)}
            errors={errors}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t px-6 py-4 space-y-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <div className="flex gap-2">
            {step.optional && (
              <Button variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            )}
            <Button onClick={handleNext} disabled={isSaving}>
              {isSaving ? 'Saving…' : isLastStep ? 'Complete Profile' : 'Continue'}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <UXModeSwitcher
            currentMode="wizard"
            userId={userId}
            stepId={step.id}
            stepIndex={currentStepIndex}
            onBeforeSwitch={onBeforeSwitch}
          />
        </div>
      </div>
    </div>
  )
}
