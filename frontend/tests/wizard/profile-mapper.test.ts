import { mapWizardToProfilePayload } from '@/app/wizard/utils/profile-mapper'
import type { WizardStepId } from '@/app/wizard/types/wizard'

function makeSteps(overrides: Partial<Record<WizardStepId, Record<string, unknown>>> = {}) {
  return {
    'personal-info': { name: 'Alice', age: 32, gender: 'female', height_cm: 165, weight_kg: 72, ...overrides['personal-info'] },
    'goals': { goal_target_weight_kg: 62, goal_timeline_weeks: 24, activity_level: 'moderate', ...overrides['goals'] },
    'medical-history': { summary: 'Hypertension', ...overrides['medical-history'] },
    'lifestyle': { sleep_hours: 7, ...overrides['lifestyle'] },
    'diet': { diet_pattern: 'Mediterranean', ...overrides['diet'] },
    'family-history': { ...overrides['family-history'] },
  }
}

describe('mapWizardToProfilePayload', () => {
  it('maps all fields to string OnboardingPayload', () => {
    const payload = mapWizardToProfilePayload(makeSteps() as any)
    expect(payload.name).toBe('Alice')
    expect(payload.age).toBe('32')
    expect(payload.gender).toBe('female')
    expect(payload.height_cm).toBe('165')
    expect(payload.weight_kg).toBe('72')
    expect(payload.goal_target_weight_kg).toBe('62')
    expect(payload.goal_timeline_weeks).toBe('24')
    expect(payload.activity_level).toBe('moderate')
    expect(payload.sleep_hours).toBe('7')
    expect(payload.diet_pattern).toBe('Mediterranean')
    expect(payload.health_conditions).toBe('Hypertension')
  })

  it('handles missing optional fields gracefully', () => {
    // Override medical-history entirely (not via makeSteps spread which keeps defaults)
    const steps = { ...makeSteps(), 'medical-history': {} as Record<string, unknown> }
    const payload = mapWizardToProfilePayload(steps as any)
    expect(payload.health_conditions).toBe('')
  })
})
