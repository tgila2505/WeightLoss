'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StepProps } from '../../types/wizard'

const DIET_PATTERNS = [
  { value: 'Mediterranean', label: 'Mediterranean' },
  { value: 'Omnivore', label: 'Omnivore (everything)' },
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Keto', label: 'Keto / Low-carb' },
  { value: 'Paleo', label: 'Paleo' },
  { value: 'Gluten-free', label: 'Gluten-free' },
  { value: 'Other', label: 'Other / Mixed' },
]

const RESTRICTIONS = [
  'Gluten', 'Dairy', 'Nuts', 'Shellfish', 'Soy', 'Eggs', 'Pork', 'Beef', 'Halal', 'Kosher',
]

export function StepDiet({ answers, onAnswersChange, errors }: StepProps) {
  function set(key: string, value: unknown) {
    onAnswersChange({ ...answers, [key]: value })
  }
  function error(field: string) {
    return errors.find((e) => e.field === field)?.message
  }

  const restrictions = (answers.restrictions as string[]) ?? []

  function toggleRestriction(item: string) {
    const updated = restrictions.includes(item)
      ? restrictions.filter((r) => r !== item)
      : [...restrictions, item]
    set('restrictions', updated)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="diet_pattern">
          Diet pattern <span className="text-destructive">*</span>
        </Label>
        <Select
          value={String(answers.diet_pattern ?? '')}
          onValueChange={(v) => set('diet_pattern', v)}
        >
          <SelectTrigger id="diet_pattern">
            <SelectValue placeholder="Select your diet style" />
          </SelectTrigger>
          <SelectContent>
            {DIET_PATTERNS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error('diet_pattern') && (
          <p className="text-xs text-destructive">{error('diet_pattern')}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Dietary restrictions / intolerances (select all that apply)</Label>
        <div className="grid grid-cols-3 gap-2">
          {RESTRICTIONS.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <Checkbox
                id={`restriction-${item}`}
                checked={restrictions.includes(item)}
                onCheckedChange={() => toggleRestriction(item)}
              />
              <Label
                htmlFor={`restriction-${item}`}
                className="text-sm font-normal cursor-pointer"
              >
                {item}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
