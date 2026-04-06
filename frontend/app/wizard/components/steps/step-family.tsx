'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { StepProps } from '../../types/wizard'

const FAMILY_CONDITIONS = [
  'Heart disease', 'Stroke', 'Type 2 Diabetes', 'Cancer',
  'Hypertension', 'High cholesterol', 'Obesity', "Alzheimer's/dementia",
  'Mental health disorder', 'Autoimmune disease', 'Osteoporosis',
]

const RELATIVES = [
  { key: 'parent', label: 'Parent(s)' },
  { key: 'sibling', label: 'Sibling(s)' },
  { key: 'grandparent', label: 'Grandparent(s)' },
]

export function StepFamilyHistory({ answers, onAnswersChange }: StepProps) {
  /**
   * Answers stored as: { 'family-history-relative': { parent: string[], sibling: string[], grandparent: string[] } }
   * Matches the existing questionnaire node schema for PUT /questionnaire/family-history-relative.
   */
  const nodeAnswers = (answers['family-history-relative'] as Record<string, string[]> | undefined) ?? {}

  function getRelativeConditions(relativeKey: string): string[] {
    return nodeAnswers[relativeKey] ?? []
  }

  function toggleCondition(relativeKey: string, condition: string) {
    const current = getRelativeConditions(relativeKey)
    const updated = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition]
    onAnswersChange({
      ...answers,
      'family-history-relative': { ...nodeAnswers, [relativeKey]: updated },
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        This step is optional. Family history helps identify genetic risk factors but won't block
        your plan.
      </p>

      {RELATIVES.map((relative) => (
        <div key={relative.key} className="space-y-2">
          <h3 className="font-medium text-sm">{relative.label}</h3>
          <div className="grid grid-cols-2 gap-2">
            {FAMILY_CONDITIONS.map((condition) => (
              <div key={condition} className="flex items-center gap-2">
                <Checkbox
                  id={`${relative.key}-${condition}`}
                  checked={getRelativeConditions(relative.key).includes(condition)}
                  onCheckedChange={() => toggleCondition(relative.key, condition)}
                />
                <Label
                  htmlFor={`${relative.key}-${condition}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {condition}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
