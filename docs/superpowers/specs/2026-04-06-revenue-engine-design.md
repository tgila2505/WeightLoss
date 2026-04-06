# Revenue Engine Design — AI Weight Loss App

**Date:** 2026-04-06
**Status:** Approved
**Scope:** Tasks 11.1.1 → 11.1.4 — Conversion funnel, value proposition, social proof, content engine

---

## Overview

Build a high-converting public acquisition funnel that transforms anonymous traffic into paying subscribers. The funnel operates as an isolated route tree (`/funnel/*`) layered on top of the existing authenticated app — zero changes to current user flows.

**Core conversion path:**
```
/funnel → /funnel/start → /funnel/preview → /funnel/upgrade → /dashboard
Landing    Onboarding      Partial plan      Paywall+pay       Full access
```

---

## Approach: Isolated `/funnel/*` Route Tree

All new routes live under `/funnel`. The existing `/login`, `/register`, `/dashboard`, `/plan`, and `/onboarding` routes are untouched. `page.tsx` (root) adds a redirect: authenticated users (valid JWT in localStorage) go to `/dashboard`; unauthenticated visitors go to `/funnel`.

**Why this approach:** Zero regression risk to existing authenticated users. Clean separation between acquisition and product layers. Can A/B test and iterate the funnel independently.

---

## Subscription Tiers

| Feature | Free | Pro ($9/mo) |
|---|---|---|
| Calories + macros preview | Forever | Forever |
| Full meal plan | 1-week trial only | Unlimited |
| Weekly schedule | 1-week trial only | Unlimited |
| Coaching insights | — | Yes |
| Profile edit UI (/user-profile, /settings) | — | Yes |
| AI-generated plans | — | Yes |

**Trial logic:** Free account created at checkout. `trial_expires_at = trial_started_at + 7 days`. After trial expires: meal plan + schedule locked, upgrade prompt shown. Calories + macros always visible. Account is retained (not deleted).

---

## Section 1 — Funnel Architecture & Data Flow

### Route Tree

```
/funnel              Landing page — hero, social proof, how-it-works, pricing anchor
/funnel/start        Anonymous onboarding — 3 steps, no auth required
/funnel/preview      Partial plan — calories + macros + locked content preview
/funnel/upgrade      Paywall — Stripe Elements + email/password, single form
/funnel/welcome      Post-payment confirmation + link to /dashboard
```

### End-to-End Flow

1. Visitor hits `/funnel` → clicks **"Get your plan — it's free"**
2. `/funnel/start` — 3-step anonymous form. On completion: `POST /api/v1/funnel/sessions` → backend stores profile in `anonymous_sessions`, returns `session_token` UUID → set as `httpOnly` cookie (`funnel_session`, 72h expiry)
3. `/funnel/preview` — `GET /api/v1/funnel/preview` (authenticated by session cookie) → returns calculated calories + macro split. Full plan content shown blurred with lock overlay
4. User clicks **"Unlock your full plan"** → `/funnel/upgrade`
5. `/funnel/upgrade` — single form: email + password + Stripe Elements card. `POST /api/v1/funnel/convert` → Stripe customer + subscription created, user account created, session profile merged into `onboarding`/`profile` tables, JWT returned
6. Frontend stores JWT → redirects to `/dashboard`
7. `/funnel/welcome` — confirmation page fires `conversion_completed` event

### New Backend API Endpoints

All under `/api/v1/funnel/`:

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /funnel/sessions` | None | Create anonymous session with profile data |
| `GET /funnel/preview` | Session cookie | Return calculated calories + macros |
| `POST /funnel/convert` | Session cookie | Pay + create account + merge session |
| `POST /funnel/events` | None | Track funnel conversion events |
| `GET /funnel/stats` | None | Return aggregate funnel counts (cached 5min) |
| `POST /funnel/stripe-webhook` | Stripe signature | Handle subscription lifecycle events |

### New Database Tables

**`anonymous_sessions`**
```
id              UUID PK
session_token   UUID (unique, indexed)  -- set as httpOnly cookie
profile_data    JSONB                   -- all 3-step onboarding inputs
created_at      timestamp
expires_at      timestamp               -- created_at + 72h, background cleanup
```

**`conversion_events`**
```
id              UUID PK
session_token   UUID (nullable, FK → anonymous_sessions)
user_id         int (nullable, FK → users)
event_name      varchar
properties      JSONB
created_at      timestamp
```

**`user_subscriptions`**
```
id                      UUID PK
user_id                 int FK → users (unique)
stripe_customer_id      varchar
stripe_subscription_id  varchar
tier                    enum: free | pro
status                  enum: active | cancelled | past_due
trial_started_at        timestamp
trial_expires_at        timestamp   -- trial_started_at + 7 days
created_at              timestamp
```

### Subscription Access Check

New `get_subscription` FastAPI dependency injected into plan endpoints:

```python
def get_subscription(user, session) -> SubscriptionAccess:
    sub = session.query(UserSubscription).filter_by(user_id=user.id).first()
    if not sub:
        return SubscriptionAccess(tier='free', trial_active=False)
    trial_active = sub.trial_expires_at > datetime.utcnow()
    return SubscriptionAccess(tier=sub.tier, trial_active=trial_active)
```

Existing `/api/v1/plans/today` gets a thin guard: if `tier=free` and `trial_active=False`, return only `{ calories, macros }` and omit meal plan fields.

### Plan Preview Calculation (No LLM)

`GET /funnel/preview` returns pure math — fast, no AI cost:

1. **BMR** — Mifflin-St Jeor formula
2. **TDEE** — BMR × activity multiplier (sedentary 1.2, moderate 1.55, high 1.725)
3. **Calorie target** — TDEE − 500 kcal/day
4. **Macro split** — Protein 30%, Carbs 40%, Fat 30% (applied to calorie target)

Response: `{ name, calories, protein_g, carbs_g, fat_g, deficit_rate, weekly_loss_kg_estimate }`

---

## Section 2 — Frontend Pages

### `/funnel` — Landing Page

Single-column, mobile-first, dark background. Section order:

1. **Nav** — logo + "Log in" link (right-aligned)
2. **Hero** — headline (A/B tested), outcome sub-headline, CTA button (A/B tested)
3. **Social proof strip** — 3 trust badges: plan counter, "Based on your biometrics", "No generic templates"
4. **How it works** — 3 steps: Answer 3 questions → Get your free calorie plan → Unlock meals + coaching for $9/mo
5. **Sample output preview** — blurred paid-plan card showing what gets unlocked
6. **Cost anchor** — *"Less than a coffee. A nutritionist charges $150/session."*
7. **Testimonials** — 3 `TestimonialCard` components
8. **Transformation examples** — 2 `TransformationCard` components
9. **Final CTA** — repeat hero button
10. **Footer** — links + copyright

### `/funnel/start` — Anonymous Onboarding

Reuses existing `Progress`, `Card`, `Input`, `Select` shadcn components. New file: `frontend/app/funnel/components/funnel-onboarding.tsx`.

- **Step 1** — Name, age, gender, height (cm), current weight (kg)
- **Step 2** — Goal weight (kg), timeline (weeks), health conditions (optional textarea)
- **Step 3** — Activity level (select), diet pattern (text input)

No backend call until step 3 completion. On finish → `POST /api/v1/funnel/sessions` → cookie set → redirect to `/funnel/preview`.

### `/funnel/preview` — Partial Plan

- Personalized headline: *"Here's {name}'s metabolic baseline"*
- Sub-headline: *"{name}, to reach {goal_weight}kg in {timeline} weeks, you need:"*
- Calorie target (large number, prominent)
- Macro split card (protein / carbs / fat in grams + visual percentage bar)
- Blurred/locked section: "Your 7-day meal plan", "Weekly schedule", "Coaching insights" — lock icon overlay, not interactive
- CTA: **"Unlock your full plan"** → `/funnel/upgrade`
- Session-based countdown timer: *"Your session plan expires in 23:47"* — starts at 24:00 on page load, stored in `sessionStorage`, does not reset on refresh

### `/funnel/upgrade` — Paywall + Checkout

Two-column layout (mobile: stacked):

- **Left column** — value recap: bullet list of what's unlocked, one testimonial card, pricing (*"$9/month — cancel anytime"*), personalized subheading: *"Unlock {name}'s full plan"*
- **Right column** — single form: email field, password field, Stripe Elements card input, submit button: **"Start free week → $9/mo after"**

Single `POST /api/v1/funnel/convert` on submit. On success: store JWT → redirect to `/dashboard`.

### `/funnel/welcome` — Confirmation

*"You're in, {name}. Your full plan is ready."* + dashboard button. Fires `conversion_completed` analytics event on mount.

---

## Section 3 — A/B Testing, Urgency & Personalization

### A/B Testing

Extends existing `lib/ab-testing.ts` and `lib/feature-flags.ts`.

**Variants tested on `/funnel` landing page:**

- `headline_variant`: `A` = *"Your AI Metabolic Coach"* | `B` = *"Lose Weight With a Plan Built for Your Body"*
- `cta_variant`: `A` = *"Get your plan — it's free"* | `B` = *"Calculate my calories now"*

Assignment: once per session via `sessionStorage`, bucket by existing rollout percentage pattern. Each impression fires `landing_variant_viewed` event. Conversion events include variant bucket for rate comparison.

**New env vars:**
```
NEXT_PUBLIC_LANDING_AB_ENABLED=true
NEXT_PUBLIC_LANDING_AB_ROLLOUT=50
```

### Urgency Triggers

Session-based countdown on `/funnel/preview` only:
- Timer starts at 24:00 on page load
- Stored in `sessionStorage` — persists across refreshes, resets on new session
- On expiry: message changes to *"Your plan is ready — don't lose it"*, CTA button pulses (CSS animation)
- Framed as a session expiry (honest), not a fake sale

### Personalization Hooks

Profile data injected into copy from session response — zero extra API calls:

| Location | Copy |
|---|---|
| `/funnel/preview` headline | *"Here's {name}'s metabolic baseline"* |
| Preview sub-headline | *"{name}, to reach {goal_weight}kg in {timeline} weeks, you need:"* |
| `/funnel/upgrade` subheading | *"Unlock {name}'s full plan — meals, schedule, and weekly coaching"* |

---

## Section 4 — Social Proof System

All components in `frontend/app/funnel/components/social-proof/`.

### `TestimonialCard`
Props: `name`, `result` (badge text), `quote`. Three on landing page, one on `/funnel/upgrade`. Initial content: static curated quotes from early users (or representative synthetics clearly not fabricated).

### `TransformationCard`
Stat pair: *"Started: 92kg → Now: 81kg · 14 weeks"*. Two cards below the how-it-works section on landing page.

### `PlanCounter`
Displays: *"14,280 plans generated"*. Reads from `GET /api/v1/funnel/stats` (cached 5 min). Static seed value increments on each `conversion_completed` event. Not a live WebSocket — simple cached integer.

---

## Section 5 — Analytics & Funnel Tracking

Extends existing `AnalyticsEventName` union in `lib/analytics.ts`. No new tracking library.

### New Event Names

```
landing_viewed              /funnel page load
landing_variant_viewed      A/B variant assigned + shown (properties: headline_variant, cta_variant)
onboarding_started          Step 1 first interaction
onboarding_step_completed   Each step completion (properties: step: 1|2|3)
onboarding_abandoned        Left mid-flow (beforeunload)
preview_viewed              /funnel/preview loaded
upgrade_clicked             "Unlock full plan" CTA tapped
checkout_started            /funnel/upgrade form interaction
conversion_completed        Successful payment + account creation
trial_expired               Fired on login when trial_expires_at has passed
```

### `GET /api/v1/funnel/stats` Response

```json
{
  "landing_views": 0,
  "onboarding_starts": 0,
  "onboarding_completions": 0,
  "preview_views": 0,
  "upgrade_clicks": 0,
  "conversions": 0,
  "plans_generated": 14280
}
```

Computed by aggregating `conversion_events`. In-memory cache, 5-minute TTL (same pattern as existing `rate_limit_service`).

### Target Conversion Rates

| Stage | Target |
|---|---|
| Landing → Onboarding start | >40% |
| Onboarding start → completion | >70% |
| Preview → Upgrade click | >25% |
| Upgrade click → Conversion | >30% |

---

## Section 6 — Content Engine Templates

Five reusable templates for daily content distribution. No code — operational documentation.

### Template 1 — Transformation Story
**Platforms:** TikTok, Twitter/X
**Hook:** "I lost [X]kg without counting every calorie — here's the only number that matters"
**Body:** TDEE explained in 30 seconds. Show the math. "Your body burns [X] calories doing nothing. Eat less than that."
**CTA:** "Get your exact number free → [link in bio]"

### Template 2 — "What I Learned" Thread
**Platform:** Twitter/X (thread format)
**Hook:** "I tested 6 weight-loss apps. Here's what none of them tell you:"
**Body:** 5 insights about metabolic rate, deficit size, protein targets. Each tweet = one insight + one stat.
**CTA:** "We built something that actually calculates this for you → [link]"

### Template 3 — Myth-Busting
**Platforms:** Reddit, TikTok
**Hook:** "Eating less doesn't always mean losing more weight. Here's why:"
**Body:** Explain adaptive thermogenesis / cortisol at high deficits. "The AI Metabolic Coach calculates your safe deficit range."
**CTA:** "Free calculator in comments / bio"

### Template 4 — Before/After Breakdown
**Platform:** TikTok
**Hook:** "[Name] was eating 1,200 calories and not losing weight. Here's what changed:"
**Body:** Walk through actual TDEE calc. Show the real deficit number. Reveal the macro split.
**CTA:** "Get your breakdown free → link in bio"

### Template 5 — Step-by-Step Guide
**Platform:** Reddit
**Hook:** "How to calculate your exact calorie target in 3 steps (no app needed)"
**Body:** Step 1: BMR formula. Step 2: Activity multiplier. Step 3: 500 kcal deficit. Show math openly. Then: "Or just enter your stats and get it instantly"
**CTA:** Link to `/funnel` — value-first, no hard sell

### Distribution Cadence

| Platform | Frequency | Primary templates |
|---|---|---|
| TikTok | 2/day | T1, T4 (visual-first) |
| Reddit | 1/day | T3, T5 (value-first, no selling) |
| Twitter/X | 1/day | T2 (thread format) |

---

## File Tree (New Files Only)

```
frontend/app/funnel/
  page.tsx                          Landing page
  layout.tsx                        Funnel layout (no nav bar)
  start/
    page.tsx
    components/
      funnel-onboarding.tsx         3-step anonymous onboarding form
  preview/
    page.tsx
    components/
      plan-preview-card.tsx         Calories + macros display
      locked-plan-preview.tsx       Blurred locked content
      countdown-timer.tsx           Session-based urgency timer
  upgrade/
    page.tsx
    components/
      upgrade-form.tsx              Email + password + Stripe Elements
      value-recap.tsx               Left column value summary
  welcome/
    page.tsx
  components/
    social-proof/
      testimonial-card.tsx
      transformation-card.tsx
      plan-counter.tsx
    how-it-works.tsx
    cost-anchor.tsx
    funnel-hero.tsx                 A/B tested headline + CTA

frontend/lib/
  funnel-session.ts                 Cookie read/write helpers
  stripe-client.ts                  Stripe Elements initialisation

backend/app/
  api/v1/endpoints/funnel.py        All /funnel/* endpoints
  models/funnel.py                  AnonymousSession, ConversionEvent, UserSubscription
  schemas/funnel.py                 Pydantic request/response schemas
  services/funnel_service.py        Session CRUD, preview calc, conversion logic
  services/stripe_service.py        Stripe customer + subscription management

backend/alembic/versions/
  xxxx_add_funnel_tables.py

Documentation/
  Conversion-Funnel-System.md       Funnel architecture + messaging framework
```

---

## Engineering Rules

- All new funnel routes are publicly accessible (no auth middleware)
- Session cookie is `httpOnly`, `SameSite=Lax`, 72h expiry
- `POST /funnel/convert` is idempotent — duplicate calls with same session token return existing user JWT
- Stripe webhook endpoint validates `stripe-signature` header before processing
- `conversion_events` writes are fire-and-forget (never block UI)
- Countdown timer stored in `sessionStorage` only — not `localStorage`
- A/B variant assignment is client-side only; server does not need to know the variant

---

## Environment Variables Required

```
# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID              # $9/month recurring price ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# A/B Testing
NEXT_PUBLIC_LANDING_AB_ENABLED=true
NEXT_PUBLIC_LANDING_AB_ROLLOUT=50
```
