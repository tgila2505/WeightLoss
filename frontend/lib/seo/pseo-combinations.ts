export type GoalType =
  | 'lose-weight'
  | 'lose-belly-fat'
  | 'lose-10kg'
  | 'lose-5kg'
  | 'lose-20kg'
  | 'get-lean'

export type DietType =
  | 'keto'
  | 'mediterranean'
  | 'intermittent-fasting'
  | 'low-carb'
  | 'calorie-deficit'
  | 'plant-based'
  | 'paleo'
  | 'vegan'

export interface PseoDimensions {
  goalType: GoalType | string
  dietType?: DietType | string
}

const GOAL_LABELS: Record<string, string> = {
  'lose-weight': 'Lose Weight',
  'lose-belly-fat': 'Lose Belly Fat',
  'lose-10kg': 'Lose 10kg',
  'lose-5kg': 'Lose 5kg',
  'lose-20kg': 'Lose 20kg',
  'get-lean': 'Get Lean',
}

const DIET_LABELS: Record<string, string> = {
  'keto': 'Keto',
  'mediterranean': 'Mediterranean',
  'intermittent-fasting': 'Intermittent Fasting',
  'low-carb': 'Low Carb',
  'calorie-deficit': 'Calorie Deficit',
  'plant-based': 'Plant-Based',
  'paleo': 'Paleo',
  'vegan': 'Vegan',
}

function goalLabel(goalType: string): string {
  return GOAL_LABELS[goalType] ?? goalType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function dietLabel(dietType: string): string {
  return DIET_LABELS[dietType] ?? dietType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function buildPseoSlug({ goalType, dietType }: PseoDimensions): string {
  return dietType ? `${goalType}-${dietType}` : goalType
}

export function buildPseoTitle({ goalType, dietType }: PseoDimensions): string {
  if (dietType) {
    return `${goalLabel(goalType)} on a ${dietLabel(dietType)} Diet`
  }
  return `How to ${goalLabel(goalType)}`
}

export function parsePseoSlug(slug: string): PseoDimensions | null {
  // Try goal+diet combos first (longer matches first)
  const goalTypes = Object.keys(GOAL_LABELS).sort((a, b) => b.length - a.length)
  for (const goalType of goalTypes) {
    if (slug === goalType) {
      return { goalType }
    }
    if (slug.startsWith(`${goalType}-`)) {
      const dietType = slug.slice(goalType.length + 1)
      return { goalType, dietType }
    }
  }
  return null
}
