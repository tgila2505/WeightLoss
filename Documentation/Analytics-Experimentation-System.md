# Analytics & Experimentation System

> Last updated: 2026-04-07

## Overview

WeightLoss uses a dual-track analytics architecture:

| Layer | Tool | Purpose |
|---|---|---|
| Product analytics | PostHog | Funnel dashboards, retention, session replay, feature flags |
| Backend event store | PostgreSQL `analytics_events` | Source of truth, offline analysis, fallback |
| Experiment assignments | PostgreSQL `experiment_assignments` | Server-validated, deterministic bucketing |

---

## Event Schema

All events share these base properties:

| Property | Type | Description |
|---|---|---|
| `session_id` | string | Browser session identifier (sessionStorage) |
| `user_id` | number \| null | Authenticated user ID; null for anonymous |
| `timestamp` | ISO 8601 | Client-side event time |
| `funnel` | boolean | Present on funnel events only |

### Event Catalogue

#### Onboarding Events
| Event | When fired | Key properties |
|---|---|---|
| `onboarding_started` | User begins the funnel onboarding form | — |
| `onboarding_step_completed` | Each step submitted | `step: 1\|2\|3` |
| `onboarding_completed` | Full profile submitted successfully | — |
| `onboarding_abandoned` | User leaves mid-onboarding | `last_step` |

#### Product Events
| Event | When fired | Key properties |
|---|---|---|
| `plan_generated` | Backend generates a meal/workout plan | `plan_type` |
| `paywall_viewed` | Subscription paywall shown | `pricing_variant`, `paywall_timing` |
| `subscription_started` | Stripe checkout completed successfully | `tier`, `pricing_variant` |
| `trial_expired` | 7-day trial ends | — |

#### Funnel Acquisition Events
| Event | When fired | Key properties |
|---|---|---|
| `landing_viewed` | `/funnel` page loads | — |
| `landing_variant_viewed` | A/B variant assigned on landing | `headline_variant`, `cta_variant` |
| `preview_viewed` | Calorie preview displayed | — |
| `upgrade_clicked` | "Unlock" CTA clicked | — |
| `checkout_started` | Stripe card form submitted | — |
| `conversion_completed` | User fully converted to paid | — |

#### UX Mode Events
| Event | When fired | Key properties |
|---|---|---|
| `ux_mode_resolved` | UX mode determined | `mode`, `source` |
| `ux_mode_preference_set` | User explicitly picks wizard/mindmap | `mode` |
| `ux_mode_switched` | Mode toggled mid-session | `from`, `to` |

---

## Funnel Definition

```
landing_viewed → onboarding_started → onboarding_completed → preview_viewed → upgrade_clicked → checkout_started → conversion_completed
```

### Tracking in PostHog

1. Open PostHog → **Product Analytics → Funnels**
2. Add steps in order using the event names above
3. Segment by `pricing_variant`, `headline_variant`, `device_type`

### Key Metrics
| Metric | Target |
|---|---|
| Landing → Onboarding start | > 40% |
| Onboarding start → Complete | > 60% |
| Preview → Upgrade click | > 25% |
| Checkout start → Conversion | > 70% |

---

## Retention Metrics

PostHog computes D1/D7/D30 retention automatically once users are identified.

### Setup in PostHog
1. **Product Analytics → Retention**
2. Starting event: `onboarding_completed`
3. Return event: `landing_viewed` OR `plan_generated`
4. Breakdown by cohort week

### Thresholds
| Metric | Healthy |
|---|---|
| D1 retention | > 40% |
| D7 retention | > 20% |
| D30 retention | > 10% |

---

## Experimentation Framework

### Architecture

- **Assignment**: Deterministic MD5 hash bucketing on `user_id + experiment_key`
- **Storage**: `experiment_assignments` table (one row per user per experiment, immutable)
- **Frontend read**: PostHog feature flags (client-side, real-time)
- **Backend validation**: `GET /api/v1/experiments/{key}/assignment` (for pricing — never trust client)

### Current Experiments

| Experiment Key | Variants | Default | Purpose |
|---|---|---|---|
| `paywall-timing` | `after-plan`, `before-plan` | `after-plan` | Show paywall before or after calorie preview |
| `pricing-variant` | `9`, `12`, `19` | `9` | Monthly price point ($USD) |
| `headline-copy` | `A`, `B` | `A` | Landing page headline variant |
| `cta-copy` | `A`, `B` | `A` | CTA button text variant |

### Adding a New Experiment

1. Add the key + variants to `EXPERIMENTS` in `backend/app/services/experiment_service.py`
2. Add the same key as a PostHog Feature Flag (PostHog dashboard → Feature Flags)
3. Add the `ExperimentKey` type union in `frontend/lib/experiments.ts`
4. Add a helper function if the experiment needs domain-specific logic (e.g. `getPricingVariant()`)
5. Fire `paywall_viewed` / relevant events with `pricing_variant` / `experiment_variant` in properties

### Pricing Experiments (Server-Validated)

**Never** read pricing from the client. Always validate server-side:

```typescript
// frontend — read assignment
const price = getPricingVariant()  // 9 | 12 | 19

// send to backend with checkout
await convertFunnelSession({ ..., pricingVariant: price })
```

```python
# backend — validate against stored assignment
assigned = get_or_assign_variant(session, user.id, "pricing-variant")
if str(payload.pricing_variant) != assigned:
    raise HTTPException(400, "Pricing variant mismatch")
```

---

## Weekly Optimisation Loop

1. **Monday**: Pull PostHog funnel report — identify weakest step (lowest conversion %)
2. **Tuesday**: Form hypothesis (e.g. "headline copy B will increase onboarding starts by 10%")
3. **Wednesday**: Configure PostHog feature flag rollout (e.g. 50% of new users)
4. **Friday+**: Monitor `landing_variant_viewed` breakdown in PostHog
5. **Next Monday**: Analyse results — ship winner, iterate on next weakest step

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes (prod) | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog ingestion host (default: `https://us.i.posthog.com`) |

Add to `.env.local` for local development (PostHog events will be ignored without a key).

---

## Data Integrity Rules

1. **No duplicate events**: `trackEvent` / `trackFunnelEvent` are fire-and-forget; the caller is responsible for not calling them twice for the same user action.
2. **No sensitive data in properties**: Never include passwords, full card numbers, or raw PII in event properties.
3. **Timestamps**: Always use `new Date().toISOString()` — client clock, not server clock.
4. **Backend fallback**: All funnel and user events are persisted in `analytics_events` regardless of PostHog availability.
