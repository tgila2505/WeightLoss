export type GoalType =
  | 'lose-weight'
  | 'lose-belly-fat'
  | 'lose-10kg'
  | 'lose-5kg'
  | 'lose-20kg'
  | 'get-lean'
  | 'burn-fat'
  | 'tone-up'
  | 'lose-weight-fast'
  | 'slim-down'
  | 'healthy-eating'
  | 'body-recomposition'

export type DietType =
  | 'keto'
  | 'mediterranean'
  | 'intermittent-fasting'
  | 'low-carb'
  | 'calorie-deficit'
  | 'plant-based'
  | 'paleo'
  | 'vegan'
  | 'high-protein'
  | 'whole30'
  | 'dash'
  | 'anti-inflammatory'
  | 'carnivore'
  | 'flexitarian'

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
  'burn-fat': 'Burn Fat',
  'tone-up': 'Tone Up',
  'lose-weight-fast': 'Lose Weight Fast',
  'slim-down': 'Slim Down',
  'healthy-eating': 'Eat Healthily and Lose Weight',
  'body-recomposition': 'Recompose Your Body',
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
  'high-protein': 'High Protein',
  'whole30': 'Whole30',
  'dash': 'DASH',
  'anti-inflammatory': 'Anti-Inflammatory',
  'carnivore': 'Carnivore',
  'flexitarian': 'Flexitarian',
}

export const GOAL_TYPES: GoalType[] = [
  'lose-weight',
  'lose-belly-fat',
  'lose-10kg',
  'lose-5kg',
  'lose-20kg',
  'get-lean',
  'burn-fat',
  'tone-up',
  'lose-weight-fast',
  'slim-down',
  'healthy-eating',
  'body-recomposition',
]

export const DIET_TYPES: DietType[] = [
  'keto',
  'mediterranean',
  'intermittent-fasting',
  'low-carb',
  'calorie-deficit',
  'plant-based',
  'paleo',
  'vegan',
  'high-protein',
  'whole30',
  'dash',
  'anti-inflammatory',
  'carnivore',
  'flexitarian',
]

function goalLabel(goalType: string): string {
  return GOAL_LABELS[goalType] ?? goalType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function dietLabel(dietType: string): string {
  return DIET_LABELS[dietType] ?? dietType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function buildPseoH1({ goalType, dietType }: PseoDimensions): string {
  if (dietType) {
    return `${goalLabel(goalType)} on a ${dietLabel(dietType)} Diet`
  }
  return `How to ${goalLabel(goalType)}`
}

export function buildPseoDescription({ goalType, dietType }: PseoDimensions): string {
  if (dietType) {
    return `Discover how to ${goalLabel(goalType).toLowerCase()} following a ${dietLabel(dietType)} diet. Get a personalised AI plan with macro targets, foods to prioritise, and expert guidance tailored to your body.`
  }
  return `Learn how to ${goalLabel(goalType).toLowerCase()} with a personalised AI metabolic plan. Get macro targets, foods to prioritise, and expert weight-loss guidance built for your body.`
}

export function getCoreSlugList(): PseoDimensions[] {
  const list: PseoDimensions[] = []
  for (const goalType of GOAL_TYPES) {
    list.push({ goalType })
    for (const dietType of DIET_TYPES) {
      list.push({ goalType, dietType })
    }
  }
  return list
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
