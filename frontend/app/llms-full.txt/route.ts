/**
 * /llms-full.txt — Comprehensive machine-readable site index for LLMs.
 *
 * Follows the llmstxt.org spec extended format.
 * Dynamically includes all pSEO combinations + static hub pages.
 * Blog posts and UGC results are listed via their respective hub pages.
 *
 * Cached for 1 day — revalidates automatically.
 */

import { NextResponse } from 'next/server';
import {
  GOAL_TYPES,
  DIET_TYPES,
  buildPseoSlug,
  buildPseoTitle,
  buildPseoDescription,
} from '@/lib/seo/pseo-combinations';

export const revalidate = 86400; // 24 hours

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://weightloss.app';

function line(title: string, url: string, description: string): string {
  return `- [${title}](${url}): ${description}`;
}

export async function GET() {
  const lines: string[] = [];

  lines.push('# WeightLoss App — AI Metabolic Coach\n');
  lines.push(
    '> WeightLoss App provides AI-powered personalised weight loss coaching. ' +
    'Every plan includes calorie targets, macro breakdowns, food priorities, ' +
    'common mistake avoidance, and step-by-step guidance tailored to your goal and diet type.\n'
  );

  // Static pages
  lines.push('## Core Pages\n');
  lines.push(line('Home', `${BASE_URL}/`, 'AI metabolic coach landing page — start your personalised weight loss journey'));
  lines.push(line('Plans Index', `${BASE_URL}/plan/`, 'Browse all 180+ weight loss plans by goal and diet combination'));
  lines.push(line('Community Results', `${BASE_URL}/results/`, 'Real user weight loss transformations with before/after details'));
  lines.push(line('Blog', `${BASE_URL}/blog/`, 'Expert articles on nutrition, metabolism, and sustainable fat loss'));
  lines.push('');

  // Goal hub pages
  lines.push('## Goal Hub Pages\n');
  for (const goal of GOAL_TYPES) {
    const label = goal.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(line(
      `${label} Plans`,
      `${BASE_URL}/plan/goal/${goal}`,
      `All diet variations for the "${label}" goal — compare keto, Mediterranean, intermittent fasting, and more`
    ));
  }
  lines.push('');

  // Diet hub pages
  lines.push('## Diet Hub Pages\n');
  for (const diet of DIET_TYPES) {
    const label = diet.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(line(
      `${label} Diet Plans`,
      `${BASE_URL}/plan/diet/${diet}`,
      `Weight loss plans using the ${label} diet — all goals supported`
    ));
  }
  lines.push('');

  // All pSEO plan pages (goal-only first, then combinations)
  lines.push('## Individual Weight Loss Plans\n');

  // Goal-only pages
  for (const goal of GOAL_TYPES) {
    const slug = buildPseoSlug({ goalType: goal });
    const title = buildPseoTitle({ goalType: goal });
    const description = buildPseoDescription({ goalType: goal });
    lines.push(line(title, `${BASE_URL}/plan/${slug}`, description));
  }
  lines.push('');

  // Goal + diet combinations
  lines.push('## Diet-Specific Plans\n');
  for (const goal of GOAL_TYPES) {
    for (const diet of DIET_TYPES) {
      const slug = buildPseoSlug({ goalType: goal, dietType: diet });
      const title = buildPseoTitle({ goalType: goal, dietType: diet });
      const description = buildPseoDescription({ goalType: goal, dietType: diet });
      lines.push(line(title, `${BASE_URL}/plan/${slug}`, description));
    }
  }
  lines.push('');

  // Discovery
  lines.push('## Discovery\n');
  lines.push(line('XML Sitemap', `${BASE_URL}/sitemap.xml`, 'Full sitemap including blog posts, user profiles, and UGC result pages'));
  lines.push(line('LLMs Summary', `${BASE_URL}/llms.txt`, 'Condensed LLMs summary index'));

  const body = lines.join('\n');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
