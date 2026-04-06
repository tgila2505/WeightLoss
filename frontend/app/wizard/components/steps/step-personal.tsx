'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StepProps } from '../../types/wizard'

export function StepPersonalInfo({ answers, onAnswersChange, errors }: StepProps) {
  function set(key: string, value: unknown) {
    onAnswersChange({ ...answers, [key]: value })
  }
  function error(field: string) {
    return errors.find((e) => e.field === field)?.message
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Full name <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          value={String(answers.name ?? '')}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Your name"
        />
        {error('name') && <p className="text-xs text-destructive">{error('name')}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="age">Age <span className="text-destructive">*</span></Label>
          <Input
            id="age"
            type="number"
            min={1}
            max={120}
            value={String(answers.age ?? '')}
            onChange={(e) => set('age', Number(e.target.value))}
            placeholder="e.g. 35"
          />
          {error('age') && <p className="text-xs text-destructive">{error('age')}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Biological sex <span className="text-destructive">*</span></Label>
          <Select value={String(answers.gender ?? '')} onValueChange={(v) => set('gender', v)}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          {error('gender') && <p className="text-xs text-destructive">{error('gender')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height_cm">Height (cm) <span className="text-destructive">*</span></Label>
          <Input
            id="height_cm"
            type="number"
            min={50}
            max={300}
            value={String(answers.height_cm ?? '')}
            onChange={(e) => set('height_cm', Number(e.target.value))}
            placeholder="e.g. 170"
          />
          {error('height_cm') && <p className="text-xs text-destructive">{error('height_cm')}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight_kg">Current weight (kg) <span className="text-destructive">*</span></Label>
          <Input
            id="weight_kg"
            type="number"
            min={20}
            max={500}
            value={String(answers.weight_kg ?? '')}
            onChange={(e) => set('weight_kg', Number(e.target.value))}
            placeholder="e.g. 80"
          />
          {error('weight_kg') && <p className="text-xs text-destructive">{error('weight_kg')}</p>}
        </div>
      </div>
    </div>
  )
}
