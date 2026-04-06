# Wizard + A/B System Architecture

## Overview

Two UX modes serve the same profile questionnaire: **Mind Map** (existing) and **Wizard** (new, step-by-step).
Both persist to the same backend tables. The UX layer is the only difference.

## Architecture Diagram

```
User request
    │
    ▼
UX Mode Resolver (frontend/lib/ux-mode.ts)
    │
    ├─ Feature Flag hard-disable? → forced mode
    ├─ URL ?ux= override? → dev/QA override
    ├─ localStorage ux_mode_preference? → user choice
    ├─ A/B assignment (hash(userId) % 100 < rolloutPct)? → experiment
    └─ Default → mindmap
    │
    ▼
/mindmap (Mind Map) ──┐
/wizard  (Wizard)  ──┘── Both call the same backend APIs
```

## Data Flow (Shared — Backend is UX-agnostic)

| Action | API endpoint | Table |
|--------|-------------|-------|
| Save demographics | `PUT /api/v1/profile` | `profiles` |
| Save conditions/history | `PUT /api/v1/questionnaire/{node_id}` | `questionnaire_responses` (JSONB) |
| Track analytics event | `POST /api/v1/analytics/events` | `analytics_events` |

## UX Mode Resolution Priority (highest → lowest)

1. **Feature flag hard-disable** — `NEXT_PUBLIC_WIZARD_ENABLED=false` → always mindmap
2. **URL override** — `?ux=wizard` or `?ux=mindmap` (dev/QA only, never shown to users)
3. **User preference** — stored in `localStorage['ux_mode_preference']` via `UXModeSwitcher`
4. **A/B assignment** — deterministic hash of `userId % 100 < WIZARD_ROLLOUT_PCT`
5. **Default** — mindmap

## Wizard Architecture

```
app/wizard/page.tsx
    │
    ├── useWizardState.ts        (localStorage-persisted step progress)
    ├── WizardShell              (progress bar, tab nav, back/next/skip)
    │   └── StepComponents[6]   (personal, goals, health, lifestyle, diet, family)
    ├── validateStep()           (per-step field validation)
    ├── mapWizardToProfilePayload()  (answers → OnboardingPayload for upsertProfile)
    ├── mapStepToNodeAnswers()   (health/family answers → questionnaire node format)
    └── trackEvent()             (fire-and-forget analytics)
```

## Key Files

| File | Responsibility |
|------|---------------|
| `frontend/lib/feature-flags.ts` | Read env-var flags into typed `FeatureFlags` object |
| `frontend/lib/ab-testing.ts` | djb2 hash → stable user bucket 0–99 |
| `frontend/lib/ux-mode.ts` | Central resolver (single source of truth) |
| `frontend/lib/analytics.ts` | Fire-and-forget event client |
| `frontend/app/wizard/` | All wizard UI code |
| `frontend/app/mindmap/components/mindmap-mode-guard.tsx` | Redirect guard on Mind Map route |
| `frontend/components/ux-mode-switcher.tsx` | Persistent UX preference toggle |
| `backend/app/api/v1/endpoints/analytics.py` | Event ingestion + persistence |
| `backend/app/models/analytics.py` | `analytics_events` ORM model |

## Environment Variables (frontend)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_WIZARD_ENABLED` | `false` | Master on/off for wizard UX |
| `NEXT_PUBLIC_MINDMAP_ENABLED` | `true` | Master on/off for mindmap UX |
| `NEXT_PUBLIC_AB_TESTING_ENABLED` | `false` | Enable A/B bucketing |
| `NEXT_PUBLIC_WIZARD_ROLLOUT_PCT` | `0` | % of users bucketed to wizard (0–100) |

## Wizard Step → Backend Mapping

| Step | Persisted via | Target |
|------|--------------|--------|
| Personal Info | `upsertProfile()` on final step | `profiles.name/age/gender/height_cm/weight_kg` |
| Goals | `upsertProfile()` on final step | `profiles.goal_target_weight_kg/goal_timeline_weeks/activity_level` |
| Medical History | `saveNodeAnswers()` per group | `questionnaire_responses` (nodeId = condition category) |
| Lifestyle | `upsertProfile()` on final step | `profiles.sleep_hours` |
| Diet | `upsertProfile()` on final step | `profiles.diet_pattern` |
| Family History | `saveNodeAnswers()` | `questionnaire_responses` (nodeId = `family-history-relative`) |
