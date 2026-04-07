export const DIET_TYPES = [
  'keto',
  'mediterranean',
  'intermittent-fasting',
  'low-carb',
  'plant-based',
  'paleo',
  'calorie-deficit',
] as const;

export const GOAL_TYPES = [
  'lose-weight',
  'lose-belly-fat',
  'lose-10kg',
  'lose-20kg',
  'get-lean',
] as const;

export const ACTIVITY_LEVELS = [
  'sedentary',
  'lightly-active',
  'moderately-active',
  'very-active',
] as const;

export const AGE_RANGES = ['20s', '30s', '40s', '50s', '60s'] as const;

export type DietType = (typeof DIET_TYPES)[number];
export type GoalType = (typeof GOAL_TYPES)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type AgeRange = (typeof AGE_RANGES)[number];

export interface PseoDimensions {
  dietType: DietType;
  goalType: GoalType;
  activityLevel?: ActivityLevel;
  ageRange?: AgeRange;
}

export function buildPseoSlug(dims: PseoDimensions): string {
  const parts = [dims.dietType, dims.goalType];
  if (dims.activityLevel) parts.push(dims.activityLevel);
  if (dims.ageRange) parts.push(dims.ageRange);
  return parts.join('-');
}

export function buildPseoTitle(dims: PseoDimensions): string {
  const diet = dims.dietType.replace(/-/g, ' ');
  const goal = dims.goalType.replace(/-/g, ' ');
  const parts = [`${diet} diet to ${goal}`];
  if (dims.activityLevel) parts.push(`for ${dims.activityLevel.replace(/-/g, ' ')} people`);
  if (dims.ageRange) parts.push(`in your ${dims.ageRange}`);
  return capitalise(parts.join(' '));
}

export function buildPseoDescription(dims: PseoDimensions): string {
  const title = buildPseoTitle(dims).toLowerCase();
  return `Personalised meal plan and workout schedule for a ${title}. Science-backed, AI-optimised, free to start.`;
}

export function buildPseoH1(dims: PseoDimensions): string {
  return buildPseoTitle(dims);
}

/** Generate a representative set of core combinations (diet × goal) */
export function getCoreSlugList(): PseoDimensions[] {
  const list: PseoDimensions[] = [];
  for (const dietType of DIET_TYPES) {
    for (const goalType of GOAL_TYPES) {
      list.push({ dietType, goalType });
    }
  }
  return list;
}

function capitalise(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
