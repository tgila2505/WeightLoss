import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { StepMedicalHistory } from '@/app/wizard/components/steps/step-health'

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div data-testid="accordion">{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeProps(overrides: Record<string, unknown> = {}) {
  const onChange = vi.fn()
  const props = {
    answers: overrides,
    onAnswersChange: onChange,
    errors: [],
  }
  return { props, onChange }
}

// ─── Gate rendering ───────────────────────────────────────────────────────

describe('StepMedicalHistory — gate section', () => {
  it('renders the three gate buttons', () => {
    const { props } = makeProps()
    render(<StepMedicalHistory {...props} />)

    expect(screen.getByText('Yes, I have some')).toBeInTheDocument()
    expect(screen.getByText('No, none I know of')).toBeInTheDocument()
    expect(screen.getByText("I'll fill this in later")).toBeInTheDocument()
  })

  it('does not show medications section before a gate is selected', () => {
    const { props } = makeProps()
    render(<StepMedicalHistory {...props} />)

    expect(screen.queryByText('Current medications')).not.toBeInTheDocument()
  })

  it('clicking "No" sets __gate to none and clears all condition nodes', () => {
    const { props, onChange } = makeProps()
    render(<StepMedicalHistory {...props} />)

    fireEvent.click(screen.getByText('No, none I know of'))

    expect(onChange).toHaveBeenCalledOnce()
    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect(called.__gate).toBe('none')
    expect(called.summary).toBe('')
    // All condition groups cleared
    expect((called['past-medical-history-cardiovascular'] as any).conditions).toEqual([])
    expect((called['past-medical-history-endocrine'] as any).conditions).toEqual([])
  })

  it('clicking "Yes" sets __gate to yes without clearing conditions', () => {
    const { props, onChange } = makeProps({
      'past-medical-history-cardiovascular': { conditions: ['Hypertension'] },
      summary: 'Hypertension',
    })
    render(<StepMedicalHistory {...props} />)

    fireEvent.click(screen.getByText('Yes, I have some'))

    expect(onChange).toHaveBeenCalledOnce()
    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect(called.__gate).toBe('yes')
    // Existing conditions preserved
    expect(called['past-medical-history-cardiovascular']).toEqual({ conditions: ['Hypertension'] })
    expect(called.summary).toBe('Hypertension')
  })

  it('clicking "Later" sets __gate to deferred', () => {
    const { props, onChange } = makeProps()
    render(<StepMedicalHistory {...props} />)

    fireEvent.click(screen.getByText("I'll fill this in later"))

    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect(called.__gate).toBe('deferred')
  })

  it('shows confirmation banner when gate is none', () => {
    const { props } = makeProps({ __gate: 'none' })
    render(<StepMedicalHistory {...props} />)

    expect(screen.getByText('No conditions recorded.')).toBeInTheDocument()
  })

  it('shows deferral notice when gate is deferred', () => {
    const { props } = makeProps({ __gate: 'deferred' })
    render(<StepMedicalHistory {...props} />)

    expect(
      screen.getByText(/complete your health history from Profile Settings/i)
    ).toBeInTheDocument()
  })

  it('shows accordion when gate is yes', () => {
    const { props } = makeProps({ __gate: 'yes' })
    render(<StepMedicalHistory {...props} />)

    expect(screen.getByTestId('accordion')).toBeInTheDocument()
  })
})

// ─── Medications section ──────────────────────────────────────────────────

describe('StepMedicalHistory — medications section', () => {
  it('shows medications section after gate is answered', () => {
    const { props } = makeProps({ __gate: 'yes' })
    render(<StepMedicalHistory {...props} />)

    expect(screen.getByText('Current medications')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'None' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I take medications' })).toBeInTheDocument()
  })

  it('clicking None sets __has_medications to false and clears medications', () => {
    const { props, onChange } = makeProps({ __gate: 'yes' })
    render(<StepMedicalHistory {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'None' }))

    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect(called.__has_medications).toBe(false)
    expect(called.__medications).toEqual([])
    expect((called['regular-medication-each-medicine'] as any).medications).toBe('')
  })

  it('clicking "I take medications" sets __has_medications to true and seeds one empty row', () => {
    const { props, onChange } = makeProps({ __gate: 'yes' })
    render(<StepMedicalHistory {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'I take medications' }))

    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect(called.__has_medications).toBe(true)
    expect(called.__medications).toEqual([{ name: '', dose: '' }])
  })

  it('shows medication input rows when hasMeds is true', () => {
    const { props } = makeProps({
      __gate: 'yes',
      __has_medications: true,
      __medications: [{ name: 'Metformin', dose: '500mg' }],
    })
    render(<StepMedicalHistory {...props} />)

    expect(screen.getByDisplayValue('Metformin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('500mg')).toBeInTheDocument()
  })

  it('updating medication name serializes correctly to medications string', () => {
    const { props, onChange } = makeProps({
      __gate: 'yes',
      __has_medications: true,
      __medications: [{ name: 'Metformin', dose: '500mg' }],
    })
    render(<StepMedicalHistory {...props} />)

    fireEvent.change(screen.getByDisplayValue('Metformin'), { target: { value: 'Aspirin' } })

    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect((called.__medications as any)[0].name).toBe('Aspirin')
    expect((called['regular-medication-each-medicine'] as any).medications).toBe('Aspirin 500mg')
  })

  it('removing the last medication collapses __has_medications to false', () => {
    const { props, onChange } = makeProps({
      __gate: 'yes',
      __has_medications: true,
      __medications: [{ name: 'Aspirin', dose: '100mg' }],
    })
    render(<StepMedicalHistory {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove medication' }))

    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect(called.__has_medications).toBe(false)
    expect(called.__medications).toEqual([])
    expect((called['regular-medication-each-medicine'] as any).medications).toBe('')
  })

  it('removing one of several medications leaves the rest', () => {
    const { props, onChange } = makeProps({
      __gate: 'yes',
      __has_medications: true,
      __medications: [
        { name: 'Aspirin', dose: '100mg' },
        { name: 'Metformin', dose: '500mg' },
      ],
    })
    render(<StepMedicalHistory {...props} />)

    // Click first remove button
    const removeButtons = screen.getAllByRole('button', { name: 'Remove medication' })
    fireEvent.click(removeButtons[0])

    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect(called.__medications).toEqual([{ name: 'Metformin', dose: '500mg' }])
    expect((called['regular-medication-each-medicine'] as any).medications).toBe('Metformin 500mg')
  })

  it('serializes multiple medications joined by semicolons', () => {
    const onChange = vi.fn()
    render(
      <StepMedicalHistory
        answers={{
          __gate: 'yes',
          __has_medications: true,
          __medications: [
            { name: 'Aspirin', dose: '100mg' },
            { name: '', dose: '' },
          ],
        }}
        onAnswersChange={onChange}
        errors={[]}
      />
    )

    // Type into the second medication name field
    const nameFields = screen.getAllByPlaceholderText('Medication name')
    fireEvent.change(nameFields[1], { target: { value: 'Metformin' } })

    const called = onChange.mock.calls[0][0] as Record<string, unknown>
    expect((called['regular-medication-each-medicine'] as any).medications).toBe('Aspirin 100mg; Metformin')
  })
})
