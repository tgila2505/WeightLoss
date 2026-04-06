export type WizardStepId =
  | 'personal-info'
  | 'goals'
  | 'medical-history'
  | 'lifestyle'
  | 'diet'
  | 'family-history'

export interface WizardStep {
  id: WizardStepId
  title: string
  subtitle: string
  /** Questionnaire node IDs that this step persists to. Empty = profile fields only. */
  nodeIds: string[]
  optional: boolean
}

export interface StepValidationError {
  field: string
  message: string
}

export interface WizardStepState {
  answers: Record<string, unknown>
  completed: boolean
  savedAt?: string
}

export interface WizardState {
  currentStepIndex: number
  steps: Record<WizardStepId, WizardStepState>
  startedAt: string
  lastSavedAt?: string
}

export interface StepProps {
  answers: Record<string, unknown>
  onAnswersChange: (answers: Record<string, unknown>) => void
  errors: StepValidationError[]
}
