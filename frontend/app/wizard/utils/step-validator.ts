import type { StepValidationError, WizardStepId } from '../types/wizard'

type Answers = Record<string, unknown>

function required(field: string, answers: Answers, label: string): StepValidationError | null {
  const val = answers[field]
  if (val == null || val === '') {
    return { field, message: `${label} is required` }
  }
  return null
}

function positiveNumber(field: string, answers: Answers, label: string): StepValidationError | null {
  const val = Number(answers[field])
  if (isNaN(val) || val <= 0) {
    return { field, message: `${label} must be a positive number` }
  }
  return null
}

const validators: Record<WizardStepId, (answers: Answers) => StepValidationError[]> = {
  'personal-info': (answers) =>
    [
      required('name', answers, 'Name'),
      positiveNumber('age', answers, 'Age'),
      required('gender', answers, 'Gender'),
      positiveNumber('height_cm', answers, 'Height'),
      positiveNumber('weight_kg', answers, 'Current weight'),
    ].filter(Boolean) as StepValidationError[],

  'goals': (answers) =>
    [
      positiveNumber('goal_target_weight_kg', answers, 'Goal weight'),
      positiveNumber('goal_timeline_weeks', answers, 'Timeline'),
      required('activity_level', answers, 'Activity level'),
    ].filter(Boolean) as StepValidationError[],

  'medical-history': () => [],
  'lifestyle': (answers) =>
    [positiveNumber('sleep_hours', answers, 'Sleep hours')].filter(Boolean) as StepValidationError[],

  'diet': (answers) =>
    [required('diet_pattern', answers, 'Diet pattern')].filter(Boolean) as StepValidationError[],

  'family-history': () => [],
}

export function validateStep(stepId: WizardStepId, answers: Answers): StepValidationError[] {
  return validators[stepId]?.(answers) ?? []
}
