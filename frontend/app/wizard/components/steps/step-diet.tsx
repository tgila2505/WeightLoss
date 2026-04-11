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

const MEAL_FREQUENCIES = ['1-2 meals/day', '3 meals/day', '3 meals + snacks', 'Grazing throughout day']
const HOME_COOKING_OPTS = ['Most meals at home', 'About half and half', 'Mostly eat out / takeout']

export function StepDiet({ answers, onAnswersChange, errors }: StepProps) {
  function set(key: string, value: unknown) {
    onAnswersChange({ ...answers, [key]: value })
  }

  function error(field: string) {
    return errors.find((e) => e.field === field)?.message
  }

  // ─── Nutrition-habits node helpers ───────────────────────────────────

  function getNutritionHabits(): Record<string, unknown> {
    return (answers['nutrition-habits'] as Record<string, unknown>) ?? {}
  }

  function setNutritionHabit(key: string, value: unknown) {
    onAnswersChange({ ...answers, 'nutrition-habits': { ...getNutritionHabits(), [key]: value } })
  }

  function getNH(key: string): string {
    return String(getNutritionHabits()[key] ?? '')
  }

  function getNHBool(key: string): boolean | undefined {
    const v = getNutritionHabits()[key]
    return v === undefined ? undefined : Boolean(v)
  }

  // ─── Shared UI ───────────────────────────────────────────────────────

  const restrictions = (answers.restrictions as string[]) ?? []

  function toggleRestriction(item: string) {
    set('restrictions', restrictions.includes(item)
      ? restrictions.filter((r) => r !== item)
      : [...restrictions, item])
  }

  function RadioRow({ qId, opts, label }: { qId: string; opts: string[]; label: string }) {
    const val = getNH(qId)
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex flex-col gap-1.5">
          {opts.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setNutritionHabit(qId, opt)}
              className={`text-left text-sm rounded-lg border px-3 py-2 transition-colors ${
                val === opt
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function YesNoRow({ qId, label }: { qId: string; label: string }) {
    const val = getNHBool(qId)
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex gap-2">
          {[true, false].map(bool => (
            <button
              key={String(bool)}
              type="button"
              onClick={() => setNutritionHabit(qId, bool)}
              className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                val === bool
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {bool ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Diet pattern — flat profile field + nutrition-groups node */}
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

      {/* Dietary restrictions — flat profile field + nutrition-groups node */}
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

      {/* Nutrition habits — saved as nutrition-habits node answers */}
      <div className="border-t pt-4 space-y-5">
        <p className="text-sm text-muted-foreground font-medium">Eating habits (optional)</p>

        <RadioRow
          qId="meal-frequency"
          label="How many times a day do you typically eat?"
          opts={MEAL_FREQUENCIES}
        />

        <RadioRow
          qId="home-cooking"
          label="How often do you cook at home?"
          opts={HOME_COOKING_OPTS}
        />

        <YesNoRow qId="tracks-macros" label="Do you track calories or macros?" />
        <YesNoRow qId="intermittent-fasting" label="Do you practice intermittent fasting?" />
      </div>

    </div>
  )
}
