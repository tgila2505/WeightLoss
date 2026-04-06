import { renderHook, act } from '@testing-library/react'
import { useWizardState } from '@/app/wizard/hooks/useWizardState'

describe('useWizardState', () => {
  it('initializes with step 0', () => {
    const { result } = renderHook(() => useWizardState())
    expect(result.current.state.currentStepIndex).toBe(0)
  })

  it('updates step answers', () => {
    const { result } = renderHook(() => useWizardState())
    act(() => {
      result.current.setStepAnswers('personal-info', { name: 'Alice', age: 30 })
    })
    expect(result.current.state.steps['personal-info'].answers.name).toBe('Alice')
  })

  it('marks step completed', () => {
    const { result } = renderHook(() => useWizardState())
    act(() => result.current.markStepCompleted('personal-info'))
    expect(result.current.state.steps['personal-info'].completed).toBe(true)
  })

  it('goToStep updates currentStepIndex', () => {
    const { result } = renderHook(() => useWizardState())
    act(() => result.current.goToStep(3))
    expect(result.current.state.currentStepIndex).toBe(3)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useWizardState())
    act(() => {
      result.current.setStepAnswers('personal-info', { name: 'Bob' })
    })
    const stored = JSON.parse(localStorage.getItem('wizard_progress')!)
    expect(stored.steps['personal-info'].answers.name).toBe('Bob')
  })

  it('clearProgress resets to initial state', () => {
    const { result } = renderHook(() => useWizardState())
    act(() => {
      result.current.setStepAnswers('personal-info', { name: 'Carol' })
      result.current.clearProgress()
    })
    expect(result.current.state.steps['personal-info'].answers).toEqual({})
    expect(result.current.state.currentStepIndex).toBe(0)
  })
})
