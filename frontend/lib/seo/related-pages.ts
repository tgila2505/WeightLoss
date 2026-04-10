import {
  DIET_TYPES,
  GOAL_TYPES,
  buildPseoSlug,
  buildPseoTitle,
  type PseoDimensions,
} from './pseo-combinations';

export interface RelatedPage {
  slug: string;
  title: string;
}

/** Return up to `limit` related pSEO pages for a given set of dimensions. */
export function getRelatedPages(dims: PseoDimensions, limit = 4): RelatedPage[] {
  const related: RelatedPage[] = [];

  // Same goal, different diets
  for (const dietType of DIET_TYPES) {
    if (dietType === dims.dietType) continue;
    const d: PseoDimensions = { dietType, goalType: dims.goalType };
    related.push({ slug: buildPseoSlug(d), title: buildPseoTitle(d) });
    if (related.length >= limit) return related;
  }

  // Same diet, different goals
  for (const goalType of GOAL_TYPES) {
    if (goalType === dims.goalType) continue;
    const d: PseoDimensions = { dietType: dims.dietType, goalType };
    related.push({ slug: buildPseoSlug(d), title: buildPseoTitle(d) });
    if (related.length >= limit) return related;
  }

  return related;
}
