import type { WizardStepId } from '../types/wizard'
import type { OnboardingPayload, MindMapAnswerValue } from '@/lib/api-client'

type StepAnswers = Record<WizardStepId, Record<string, unknown>>

function str(val: unknown): string {
  return val != null ? String(val) : ''
}

export function mapWizardToProfilePayload(steps: StepAnswers): OnboardingPayload {
  const personal = steps['personal-info']
  const goals = steps['goals']
  const health = steps['medical-history']
  const lifestyle = steps['lifestyle']
  const diet = steps['diet']

  return {
    name: str(personal.name),
    age: str(personal.age),
    gender: str(personal.gender),
    height_cm: str(personal.height_cm),
    weight_kg: str(personal.weight_kg),
    goal_target_weight_kg: str(goals.goal_target_weight_kg),
    goal_timeline_weeks: str(goals.goal_timeline_weeks),
    health_conditions: str(health.summary),
    activity_level: str(goals.activity_level),
    sleep_hours: str(lifestyle.sleep_hours),
    diet_pattern: str(diet.diet_pattern),
  }
}

/**
 * Returns answers for a given step's questionnaire node IDs,
 * formatted as Record<nodeId, Record<questionId, MindMapAnswerValue>>.
 * Used to persist medical/family history answers via PUT /questionnaire/{node_id}.
 */
export function mapStepToNodeAnswers(
  stepId: WizardStepId,
  answers: Record<string, unknown>,
): Record<string, Record<string, MindMapAnswerValue>> {
  if (stepId === 'medical-history' || stepId === 'family-history') {
    // Exclude UI-state keys (__ prefix) and the flat summary field —
    // only questionnaire node IDs should be sent to saveNodeAnswers.
    return Object.fromEntries(
      Object.entries(answers).filter(([k]) => !k.startsWith('__') && k !== 'summary')
    ) as Record<string, Record<string, MindMapAnswerValue>>
  }
  return {}
}
