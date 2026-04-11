# SEO Build Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all build-breaking missing exports in the SEO library so `frontend` compiles cleanly and all pSEO pages, sitemap, and OG routes work.

**Architecture:** Add the 5 missing exports to `pseo-combinations.ts`, add `buildFaqSchema` to `schema.ts`, and upgrade root layout metadata with OpenGraph plus publisher schema.

**Tech Stack:** Next.js 15 App Router, TypeScript, Schema.org JSON-LD

---

## File Map

| File | Action | Reason |
|------|--------|--------|
| `frontend/lib/seo/pseo-combinations.ts` | Modify | Add `GOAL_TYPES`, `DIET_TYPES`, `buildPseoH1`, `buildPseoDescription`, `getCoreSlugList` |
| `frontend/lib/seo/schema.ts` | Modify | Add `buildFaqSchema` |
| `frontend/app/layout.tsx` | Modify | Add OpenGraph, Twitter, robots root metadata + publisher JSON-LD via metadata other field |

---

## Task 1: Add missing exports to pseo-combinations.ts

- [ ] Add `GOAL_TYPES: GoalType[]` and `DIET_TYPES: DietType[]` as exported arrays (derived from existing GOAL_LABELS/DIET_LABELS keys)
- [ ] Add `buildPseoH1({ goalType, dietType })` — same text as buildPseoTitle base (no suffix)
- [ ] Add `buildPseoDescription({ goalType, dietType })` — SEO-friendly paragraph description
- [ ] Add `getCoreSlugList(): PseoDimensions[]` — 6 goal-only + 48 goal+diet = 54 combinations

## Task 2: Add buildFaqSchema to schema.ts

- [ ] Add `FaqItem { q: string; a: string }` interface
- [ ] Add `buildFaqSchema(faqs: FaqItem[]): Record<string, unknown>` — returns FAQPage schema.org object

## Task 3: Upgrade root layout metadata

- [ ] Replace static metadata with full OpenGraph + Twitter + robots config
- [ ] Add publisher Organization schema via metadata.other['script:ld+json']
