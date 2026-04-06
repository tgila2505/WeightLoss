'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StepProps } from '../../types/wizard'

export function StepLifestyle({ answers, onAnswersChange, errors }: StepProps) {
  function set(key: string, value: unknown) {
    onAnswersChange({ ...answers, [key]: value })
  }
  function error(field: string) {
    return errors.find((e) => e.field === field)?.message
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="sleep_hours">
          Average sleep per night (hours) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sleep_hours"
          type="number"
          min={1}
          max={24}
          step={0.5}
          value={String(answers.sleep_hours ?? '')}
          onChange={(e) => set('sleep_hours', Number(e.target.value))}
          placeholder="e.g. 7"
        />
        {error('sleep_hours') && <p className="text-xs text-destructive">{error('sleep_hours')}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="stress_level">Stress level</Label>
        <Select
          value={String(answers.stress_level ?? '')}
          onValueChange={(v) => set('stress_level', v)}
        >
          <SelectTrigger id="stress_level">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low — rarely stressed</SelectItem>
            <SelectItem value="moderate">Moderate — occasional stress</SelectItem>
            <SelectItem value="high">High — frequently stressed</SelectItem>
            <SelectItem value="very_high">Very high — chronic stress</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="smoking">Smoking status</Label>
        <Select
          value={String(answers.smoking ?? '')}
          onValueChange={(v) => set('smoking', v)}
        >
          <SelectTrigger id="smoking">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never smoked</SelectItem>
            <SelectItem value="former">Former smoker</SelectItem>
            <SelectItem value="current">Current smoker</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alcohol">Alcohol consumption</Label>
        <Select
          value={String(answers.alcohol ?? '')}
          onValueChange={(v) => set('alcohol', v)}
        >
          <SelectTrigger id="alcohol">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="occasional">Occasional (1–2 drinks/week)</SelectItem>
            <SelectItem value="moderate">Moderate (3–7 drinks/week)</SelectItem>
            <SelectItem value="heavy">Heavy (8+ drinks/week)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
