'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StepProps } from '../../types/wizard'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary — little or no exercise' },
  { value: 'low', label: 'Low — light exercise 1–3 days/week' },
  { value: 'moderate', label: 'Moderate — exercise 3–5 days/week' },
  { value: 'active', label: 'Active — hard exercise 6–7 days/week' },
  { value: 'very_active', label: 'Very active — physical job + training' },
]

export function StepGoals({ answers, onAnswersChange, errors }: StepProps) {
  function set(key: string, value: unknown) {
    onAnswersChange({ ...answers, [key]: value })
  }
  function error(field: string) {
    return errors.find((e) => e.field === field)?.message
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="goal_target_weight_kg">Goal weight (kg) <span className="text-destructive">*</span></Label>
          <Input
            id="goal_target_weight_kg"
            type="number"
            min={20}
            max={500}
            value={String(answers.goal_target_weight_kg ?? '')}
            onChange={(e) => set('goal_target_weight_kg', Number(e.target.value))}
            placeholder="e.g. 70"
          />
          {error('goal_target_weight_kg') && (
            <p className="text-xs text-destructive">{error('goal_target_weight_kg')}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal_timeline_weeks">Timeline (weeks) <span className="text-destructive">*</span></Label>
          <Input
            id="goal_timeline_weeks"
            type="number"
            min={1}
            max={520}
            value={String(answers.goal_timeline_weeks ?? '')}
            onChange={(e) => set('goal_timeline_weeks', Number(e.target.value))}
            placeholder="e.g. 24"
          />
          {error('goal_timeline_weeks') && (
            <p className="text-xs text-destructive">{error('goal_timeline_weeks')}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity_level">Current activity level <span className="text-destructive">*</span></Label>
        <Select
          value={String(answers.activity_level ?? '')}
          onValueChange={(v) => set('activity_level', v)}
        >
          <SelectTrigger id="activity_level">
            <SelectValue placeholder="Select your activity level" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error('activity_level') && (
          <p className="text-xs text-destructive">{error('activity_level')}</p>
        )}
      </div>
    </div>
  )
}
