import { mapWizardToProfilePayload, mapStepToNodeAnswers } from '@/app/wizard/utils/profile-mapper'
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

describe('mapStepToNodeAnswers', () => {
  it('returns empty object for non-medical steps', () => {
    const answers = { name: 'Alice', age: 32 }
    expect(mapStepToNodeAnswers('personal-info', answers)).toEqual({})
    expect(mapStepToNodeAnswers('goals', answers)).toEqual({})
    expect(mapStepToNodeAnswers('lifestyle', answers)).toEqual({})
    expect(mapStepToNodeAnswers('diet', answers)).toEqual({})
  })

  it('returns node answers for medical-history step', () => {
    const answers = {
      'past-medical-history-cardiovascular': { conditions: ['Hypertension'] },
      'regular-medication-each-medicine': { medications: 'Metformin 500mg' },
    }
    const result = mapStepToNodeAnswers('medical-history', answers)
    expect(result['past-medical-history-cardiovascular']).toEqual({ conditions: ['Hypertension'] })
    expect(result['regular-medication-each-medicine']).toEqual({ medications: 'Metformin 500mg' })
  })

  it('strips __ prefixed UI-state keys from medical-history answers', () => {
    const answers = {
      'past-medical-history-cardiovascular': { conditions: ['Hypertension'] },
      __gate: 'yes',
      __has_medications: true,
      __medications: [{ name: 'Metformin', dose: '500mg' }],
    }
    const result = mapStepToNodeAnswers('medical-history', answers)
    expect('__gate' in result).toBe(false)
    expect('__has_medications' in result).toBe(false)
    expect('__medications' in result).toBe(false)
    expect(result['past-medical-history-cardiovascular']).toEqual({ conditions: ['Hypertension'] })
  })

  it('strips the summary key from medical-history answers', () => {
    const answers = {
      'past-medical-history-endocrine': { conditions: ['Type 2 Diabetes'] },
      summary: 'Type 2 Diabetes',
    }
    const result = mapStepToNodeAnswers('medical-history', answers)
    expect('summary' in result).toBe(false)
    expect(result['past-medical-history-endocrine']).toEqual({ conditions: ['Type 2 Diabetes'] })
  })

  it('returns node answers for family-history step with same filtering', () => {
    const answers = {
      'family-history-relative': { conditions: ['Heart disease'] },
      summary: 'Heart disease',
      __gate: 'yes',
    }
    const result = mapStepToNodeAnswers('family-history', answers)
    expect(result['family-history-relative']).toEqual({ conditions: ['Heart disease'] })
    expect('summary' in result).toBe(false)
    expect('__gate' in result).toBe(false)
  })

  it('returns empty object when medical-history answers are empty', () => {
    expect(mapStepToNodeAnswers('medical-history', {})).toEqual({})
  })
})
