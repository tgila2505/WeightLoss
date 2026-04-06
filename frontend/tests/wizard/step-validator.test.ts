import { validateStep } from '@/app/wizard/utils/step-validator'

describe('validateStep', () => {
  it('requires name on personal-info step', () => {
    const errors = validateStep('personal-info', { age: 30, gender: 'male', height_cm: 175, weight_kg: 80 })
    expect(errors.some((e) => e.field === 'name')).toBe(true)
  })

  it('requires age to be a positive number', () => {
    const errors = validateStep('personal-info', { name: 'Bob', age: -1, gender: 'male', height_cm: 175, weight_kg: 80 })
    expect(errors.some((e) => e.field === 'age')).toBe(true)
  })

  it('passes valid personal-info', () => {
    const errors = validateStep('personal-info', { name: 'Bob', age: 30, gender: 'male', height_cm: 175, weight_kg: 80 })
    expect(errors).toHaveLength(0)
  })

  it('requires goal_target_weight_kg on goals step', () => {
    const errors = validateStep('goals', { goal_timeline_weeks: 12, activity_level: 'low' })
    expect(errors.some((e) => e.field === 'goal_target_weight_kg')).toBe(true)
  })

  it('returns no errors for optional steps (family-history)', () => {
    const errors = validateStep('family-history', {})
    expect(errors).toHaveLength(0)
  })

  it('returns no errors for medical-history (all optional)', () => {
    const errors = validateStep('medical-history', {})
    expect(errors).toHaveLength(0)
  })
})
