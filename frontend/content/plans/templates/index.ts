/**
 * Content template resolver.
 *
 * Given parsed pSEO dimensions, returns the full content block object
 * ready to be passed into the pSEO page component.
 */

import type { PseoDimensions, GoalType, DietType } from '@/lib/seo/pseo-combinations';
import { getGoalOnlyContent } from './goal-only';
import { getGoalDietContent } from './goal-diet';

export interface PseoContentBlock {
  intro: string;
  dietIntro?: string;
  foodsToPrioritize: string[];
  commonMistakes: string[];
  proteinTarget?: string;
  calorieGuidance?: string;
  faq?: Array<{ q: string; a: string }>;
}

export function getPseoContent(dims: PseoDimensions): PseoContentBlock {
  if (dims.dietType) {
    const goalDiet = getGoalDietContent(dims.goalType as GoalType, dims.dietType as DietType);
    const goalOnly = getGoalOnlyContent(dims.goalType as GoalType);
    return {
      intro: goalOnly.intro,
      dietIntro: goalDiet.dietIntro,
      foodsToPrioritize: goalDiet.foodsToPrioritize,
      commonMistakes: goalDiet.commonMistakes,
      proteinTarget: goalDiet.proteinTarget,
      calorieGuidance: goalDiet.calorieGuidance,
      faq: goalOnly.faq,
    };
  }

  const goalOnly = getGoalOnlyContent(dims.goalType as GoalType);
  return {
    intro: goalOnly.intro,
    foodsToPrioritize: goalOnly.foodsToPrioritize,
    commonMistakes: goalOnly.commonMistakes,
    faq: goalOnly.faq,
  };
}
