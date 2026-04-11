import type { WizardStepId } from '../types/wizard'
import type { OnboardingPayload, MindMapAnswerValue, ProfileResponse } from '@/lib/api-client'

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
 * Maps a saved ProfileResponse back to per-step wizard answers so the wizard
 * can be pre-filled when the user revisits after completing it.
 * Only includes fields that have a value; steps with no data are omitted.
 */
export function mapProfileToWizardAnswers(
  profile: ProfileResponse,
): Partial<Record<WizardStepId, Record<string, unknown>>> {
  const result: Partial<Record<WizardStepId, Record<string, unknown>>> = {}

  const personal: Record<string, unknown> = {}
  if (profile.name) personal.name = profile.name
  if (profile.age) personal.age = String(profile.age)
  if (profile.gender) personal.gender = profile.gender
  if (profile.height_cm != null) personal.height_cm = String(profile.height_cm)
  if (profile.weight_kg != null) personal.weight_kg = String(profile.weight_kg)
  if (Object.keys(personal).length > 0) result['personal-info'] = personal

  const goals: Record<string, unknown> = {}
  if (profile.goal_target_weight_kg != null) goals.goal_target_weight_kg = String(profile.goal_target_weight_kg)
  if (profile.goal_timeline_weeks != null) goals.goal_timeline_weeks = String(profile.goal_timeline_weeks)
  if (profile.activity_level) goals.activity_level = profile.activity_level
  if (Object.keys(goals).length > 0) result['goals'] = goals

  const medical: Record<string, unknown> = {}
  if (profile.health_conditions) medical.summary = profile.health_conditions
  if (Object.keys(medical).length > 0) result['medical-history'] = medical

  const lifestyle: Record<string, unknown> = {}
  if (profile.sleep_hours != null) lifestyle.sleep_hours = String(profile.sleep_hours)
  if (Object.keys(lifestyle).length > 0) result['lifestyle'] = lifestyle

  const diet: Record<string, unknown> = {}
  if (profile.diet_pattern) diet.diet_pattern = profile.diet_pattern
  if (Object.keys(diet).length > 0) result['diet'] = diet

  return result
}

/**
 * Returns answers for a given step's questionnaire node IDs,
 * formatted as Record<nodeId, Record<questionId, MindMapAnswerValue>>.
 * Used to persist medical/family history answers via PUT /questionnaire/{node_id}.
 */
// Flat profile fields that live on the profile model — not node answers.
const LIFESTYLE_FLAT_FIELDS = new Set(['sleep_hours', 'stress_level', 'smoking', 'alcohol'])
const DIET_FLAT_FIELDS = new Set(['diet_pattern', 'restrictions'])

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

  if (stepId === 'lifestyle') {
    // Keep only node-ID keys; exclude flat profile fields and UI-state keys.
    return Object.fromEntries(
      Object.entries(answers).filter(([k]) => !k.startsWith('__') && !LIFESTYLE_FLAT_FIELDS.has(k))
    ) as Record<string, Record<string, MindMapAnswerValue>>
  }

  if (stepId === 'diet') {
    // Map flat diet fields into the nutrition-groups node, then include any
    // additional node-ID keys (e.g. nutrition-habits) stored directly.
    const nutritionGroups: Record<string, MindMapAnswerValue> = {}
    if (answers.diet_pattern) nutritionGroups['diet-pattern'] = String(answers.diet_pattern)
    if (Array.isArray(answers.restrictions) && answers.restrictions.length > 0) {
      nutritionGroups['sensitivities'] = answers.restrictions as string[]
    }

    const extraNodes = Object.fromEntries(
      Object.entries(answers).filter(([k]) => !k.startsWith('__') && !DIET_FLAT_FIELDS.has(k))
    ) as Record<string, Record<string, MindMapAnswerValue>>

    return {
      ...(Object.keys(nutritionGroups).length > 0 ? { 'nutrition-groups': nutritionGroups } : {}),
      ...extraNodes,
    }
  }

  return {}
}
