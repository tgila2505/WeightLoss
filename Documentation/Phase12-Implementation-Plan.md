# Phase 12 — Monetization & Billing System
## Implementation Plan

**Date:** 2026-04-07
**Status:** Ready for Implementation
**Scope:** Tasks 12.1 → 12.3 — Stripe billing, subscription lifecycle, feature gating, paywall, checkout, conversion optimization
**Depends on:** Phase 11 Revenue Engine (anonymous sessions, `/funnel/*` routes, `user_subscriptions`, `conversion_events`)

---

## 1. System Architecture

### Overview

Phase 12 builds on the Phase 11 funnel by adding the full billing infrastructure behind the paywall. Phase 11 created the acquisition path (landing → onboarding → preview → upgrade form). Phase 12 makes billing reliable, gated features enforceable, and the checkout experience conversion-optimized.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BILLING SYSTEM                              │
│                                                                     │
│  ┌──────────┐   ┌─────────────────┐   ┌──────────────────────┐    │
│  │  Stripe  │──▶│ Webhook Handler  │──▶│ Subscription Service │    │
│  │  Cloud   │   │ /stripe-webhook  │   │ (lifecycle manager)  │    │
│  └──────────┘   └─────────────────┘   └──────────┬───────────┘    │
│                                                   │                 │
│                          ┌──────────────────────┐ │                 │
│                          │  Billing Event Log   │◀┘                 │
│                          └──────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        FEATURE GATING LAYER                         │
│                                                                     │
│  Request → [Auth Middleware] → [Subscription Check] → [Capability  │
│             (existing)         (get_subscription)      Gate]        │
│                                                         │           │
│                                        ┌────────────────┴──────┐   │
│                                        │  UsageTracker Service │   │
│                                        │  (soft limit checks)  │   │
│                                        └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         PAYWALL SYSTEM                              │
│                                                                     │
│  Protected endpoint response includes:                              │
│  { data: null, paywall: { reason, feature, upgrade_url } }         │
│  Frontend renders partial content + contextual upgrade prompt       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        CHECKOUT SYSTEM                              │
│                                                                     │
│  /funnel/upgrade → Stripe Elements (card + Apple Pay + Google Pay) │
│  POST /api/v1/billing/checkout → Stripe PaymentIntent → confirm    │
│  → /funnel/welcome (confirmation + analytics)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow — Subscription Creation

```
User submits upgrade form
  → POST /api/v1/funnel/convert (Phase 11 endpoint, extended in Phase 12)
    → Create Stripe Customer
    → Attach PaymentMethod (from Stripe Elements token)
    → Create Stripe Subscription (price_id based on tier + interval)
    → Insert user_subscriptions row
    → Insert billing_event row (type: subscription_created)
    → Return JWT to frontend
    → Frontend redirects → /dashboard
```

### Data Flow — Webhook Event

```
Stripe fires event → POST /api/v1/billing/stripe-webhook
  → Validate stripe-signature header (reject if invalid — 400)
  → Extract event type
  → Route to handler (idempotency: check billing_events for stripe_event_id)
  → Update user_subscriptions
  → Insert billing_event row
  → Return 200 immediately
```

---

## 2. Pricing Strategy

### Tier Definitions

| Feature | Free | Pro ($9/mo) | Pro+ ($19/mo) |
|---|---|---|---|
| Calorie + macro calculator | ✅ Always | ✅ Always | ✅ Always |
| Full 7-day meal plan | Trial only (7 days) | ✅ Unlimited | ✅ Unlimited |
| Weekly schedule | Trial only (7 days) | ✅ Unlimited | ✅ Unlimited |
| Profile edit (/user-profile, /settings) | ❌ | ✅ | ✅ |
| AI-generated plans | ❌ | ✅ | ✅ |
| Coaching insights | ❌ | ✅ | ✅ |
| Goal-specific plans (muscle gain, keto, PCOS) | ❌ | ❌ | ✅ |
| Advanced AI coaching (weekly check-ins) | ❌ | ❌ | ✅ |
| Weekly AI progress report (PDF) | ❌ | ❌ | ✅ |
| Priority support | ❌ | ❌ | ✅ |

### Pricing Matrix

| Tier | Monthly | Annual | Annual Monthly Equivalent | Savings |
|---|---|---|---|---|
| Free | $0 | $0 | — | — |
| Pro | $9/mo | $79/yr | $6.58/mo | 27% off |
| Pro+ | $19/mo | $99/yr | $8.25/mo | 57% off |

**Annual plan anchor:** Pro+ annual ($99/yr) is positioned as the hero plan on the pricing page — highest value, most prominent. The $99 price point is a deliberate anchor: it feels like a one-time purchase, not a recurring subscription.

### Upgrade / Downgrade Paths

```
Free → Pro (monthly)     Immediate. Stripe subscription created. Trial period ends.
Free → Pro (annual)      Immediate. Same as above, annual price_id.
Free → Pro+ (monthly)    Immediate.
Free → Pro+ (annual)     Immediate. Hero plan — primary CTA.

Pro → Pro+               Stripe prorates the remaining period. Instant access upgrade.
Pro+ → Pro               Effective at period end (Stripe schedule). No immediate downgrade.
Pro → Free               Cancellation. Stripe subscription cancelled. Access retained until period end.
Pro+ → Free              Same as above.

Annual → Monthly         Not supported mid-period. User can switch on renewal.
```

---

## 3. Stripe Integration Design

### Products & Price IDs

Create these in the Stripe Dashboard before deployment:

| Product | Interval | Stripe Price ID (env var) |
|---|---|---|
| Pro | Monthly | `STRIPE_PRO_MONTHLY_PRICE_ID` |
| Pro | Annual | `STRIPE_PRO_ANNUAL_PRICE_ID` |
| Pro+ | Monthly | `STRIPE_PRO_PLUS_MONTHLY_PRICE_ID` |
| Pro+ | Annual | `STRIPE_PRO_PLUS_ANNUAL_PRICE_ID` |

### Webhook Events Handled

| Stripe Event | Action |
|---|---|
| `customer.subscription.created` | Insert/update `user_subscriptions`, set `status=active`, set `current_period_end` |
| `customer.subscription.updated` | Update tier, status, `current_period_end` — handles upgrades/downgrades/renewals |
| `customer.subscription.deleted` | Set `status=cancelled`, retain row for history |
| `invoice.paid` | Set `status=active` (clears past_due), insert `billing_event` |
| `invoice.payment_failed` | Set `status=past_due`, start retry countdown, queue dunning email |
| `invoice.payment_action_required` | Set `status=past_due`, send 3DS/SCA email to user |
| `payment_method.attached` | Update default payment method on customer |

### Idempotency Rule

Before processing any webhook: query `billing_events` for `stripe_event_id = event.id`. If found, return `200` immediately without re-processing. This is the single most important correctness guarantee.

### Stripe Configuration Requirements

```
STRIPE_SECRET_KEY                   (backend only)
STRIPE_WEBHOOK_SECRET               (backend only — from Stripe Dashboard endpoint)
STRIPE_PRO_MONTHLY_PRICE_ID         (backend only)
STRIPE_PRO_ANNUAL_PRICE_ID          (backend only)
STRIPE_PRO_PLUS_MONTHLY_PRICE_ID    (backend only)
STRIPE_PRO_PLUS_ANNUAL_PRICE_ID     (backend only)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  (frontend — safe to expose)
```

---

## 4. Subscription Lifecycle Management

### State Machine

```
            ┌─────────────────────────────────────────────┐
            │                                             │
            ▼                                             │ invoice.paid
        [ active ] ──── invoice.payment_failed ──▶ [ past_due ]
            │                                             │
            │ subscription.deleted                        │ 3 retries fail
            ▼                                             ▼
        [ cancelled ] ◀──────────────────────── [ cancelled ]
            │
            │ (access retained until current_period_end)
            ▼
        [ free tier enforced ]
```

### Retry Logic

Stripe Smart Retries handles payment retries automatically (Smart Retries enabled in Dashboard settings). Backend tracking:

- **Attempt 1 (day 0):** Initial failure → set `status=past_due`, send "Payment failed" email
- **Attempt 2 (day 3):** Stripe retries → if fails, send "Update payment method" email with `/billing/payment-method` link
- **Attempt 3 (day 5):** Stripe retries → if fails, send "Final notice — access ending" email
- **Attempt 4 (day 7):** Stripe retries → if fails, Stripe cancels subscription → `customer.subscription.deleted` webhook → set `status=cancelled`

Backend does **not** implement retry scheduling — Stripe manages retries. Backend only reacts to webhook events.

### Grace Period

Users with `status=past_due` retain full tier access for 7 days (the retry window). After `customer.subscription.deleted`, access downgrades to free tier **at the next request** — no background job needed. The `get_subscription` dependency checks `status` on every request.

```python
def get_subscription(user, session) -> SubscriptionAccess:
    sub = session.query(UserSubscription).filter_by(user_id=user.id).first()
    if not sub or sub.status == 'cancelled':
        return SubscriptionAccess(tier='free', trial_active=False)
    if sub.status == 'past_due':
        # Grace period: still grant access, flag for UI banner
        return SubscriptionAccess(tier=sub.tier, trial_active=False, past_due=True)
    trial_active = sub.trial_expires_at and sub.trial_expires_at > datetime.utcnow()
    return SubscriptionAccess(tier=sub.tier, trial_active=trial_active)
```

### Cancellation Flow

- User clicks "Cancel subscription" in `/settings/billing`
- `POST /api/v1/billing/cancel` → Stripe `subscription.cancel(cancel_at_period_end=True)`
- `user_subscriptions.cancel_at_period_end = True`, `cancelled_at = now`
- Stripe fires `customer.subscription.updated` (with `cancel_at_period_end=true`) → no status change yet
- Stripe fires `customer.subscription.deleted` at period end → set `status=cancelled`
- Frontend shows: "Your Pro access continues until [date]. After that, you'll be on the free plan."

---

## 5. Feature Gating System

### Capability Matrix

```python
TIER_CAPABILITIES = {
    'free': {
        'meal_plan_full': False,
        'weekly_schedule': False,
        'profile_edit': False,
        'ai_plans': False,
        'coaching_insights': False,
        'goal_specific_plans': False,
        'advanced_coaching': False,
        'weekly_ai_report': False,
    },
    'pro': {
        'meal_plan_full': True,
        'weekly_schedule': True,
        'profile_edit': True,
        'ai_plans': True,
        'coaching_insights': True,
        'goal_specific_plans': False,
        'advanced_coaching': False,
        'weekly_ai_report': False,
    },
    'pro_plus': {
        'meal_plan_full': True,
        'weekly_schedule': True,
        'profile_edit': True,
        'ai_plans': True,
        'coaching_insights': True,
        'goal_specific_plans': True,
        'advanced_coaching': True,
        'weekly_ai_report': True,
    },
}
```

### Backend Access Middleware

FastAPI dependency, injected into any route that requires a capability check:

```python
# backend/app/dependencies/billing.py

def require_capability(capability: str):
    def dependency(
        access: SubscriptionAccess = Depends(get_subscription),
    ) -> SubscriptionAccess:
        # Trial active users get pro-equivalent access
        effective_tier = access.tier
        if access.trial_active and effective_tier == 'free':
            effective_tier = 'pro'
        if not TIER_CAPABILITIES.get(effective_tier, {}).get(capability, False):
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "FEATURE_GATED",
                    "feature": capability,
                    "upgrade_url": "/funnel/upgrade",
                    "required_tier": _minimum_tier_for(capability),
                }
            )
        return access
    return dependency
```

Usage on existing endpoints:

```python
@router.get("/plans/today")
async def get_today_plan(
    access: SubscriptionAccess = Depends(require_capability("meal_plan_full")),
    ...
):
```

For endpoints that return partial data (rather than blocking entirely), use a softer pattern — check `access.tier` inside the handler and omit fields rather than raising 403.

### Soft Usage Limits

Usage limits cap consumption for Free users without hard-blocking. They surface as warnings before the hard cap.

| Feature | Free Soft Limit | Free Hard Cap | Pro Soft Limit | Pro Hard Cap | Pro+ |
|---|---|---|---|---|---|
| AI plan regenerations | 1/week | 1/week | 5/week | 10/week | Unlimited |
| Coaching insight requests | — | 0 | 5/day | 10/day | Unlimited |
| Weekly AI reports | — | 0 | — | 0 | 1/week |
| Goal-specific plan variations | — | 0 | — | 0 | Unlimited |

Tracking via `usage_tracking` table (see Section 10). `UsageTracker` service checks counts before allowing AI feature calls. At 80% of soft limit: return `X-Usage-Warning: true` header + include `usage_warning` in response JSON. At 100%: raise `429` with upgrade payload.

---

## 6. Paywall System

### Partial Locking Strategy

The paywall is not a full-screen block — it is a **progressive reveal**. Users see enough to understand the value, then hit a locked section with a clear unlock path.

| Feature | Free users see | Locked element |
|---|---|---|
| Meal plan | Day 1 meals only | Days 2–7 blurred with lock overlay |
| Weekly schedule | Monday only | Tue–Sun blurred |
| Coaching insights | Section header | Content replaced with upgrade card |
| AI reports | Report title + date | Download button disabled, upgrade prompt |
| Goal-specific plans | Plan name only | Content gated, modal on click |

### Trigger Points

Paywall is surfaced in three contexts:

1. **In-page partial lock** — User scrolls to locked content. Lock overlay visible without interaction.
2. **Click-triggered modal** — User clicks on a locked element (e.g., blurred day-2 meal). Modal appears: feature summary + upgrade CTA + plan selector.
3. **API-triggered (403 response)** — Frontend catches `FEATURE_GATED` error code. Renders `<UpgradeModal>` with `feature` and `required_tier` props. Used for programmatic actions (e.g., requesting AI regeneration).

### Messaging Strategy

**Context-aware copy** — The upgrade prompt headline changes based on which feature is gated:

| Gated Feature | Headline | Sub-copy |
|---|---|---|
| Full meal plan | "Your meals are planned. Unlock them." | "Days 2–7 are ready for {name}. Upgrade to see your full week." |
| Coaching insights | "Your coach has feedback." | "Based on your last 7 days, your AI coach has 3 suggestions." |
| Weekly AI report | "Your progress report is ready." | "See exactly what's working and what to adjust." |
| Goal-specific plan | "Built for your exact goal." | "Keto, muscle gain, PCOS protocols — personalized to your biology." |
| AI regeneration | "You've used your free plan." | "Regenerate anytime with Pro — plans update as your goals change." |

All paywall messages are defined in `frontend/lib/paywall-messages.ts` — one object per `capability` key. No inline copy in components.

---

## 7. Outcome-Based Monetization

### Goal-Specific Premium Plans (Pro+)

Pro+ users gain access to pre-configured protocol overlays applied on top of their base calorie/macro plan. These are not separate meal plans — they modify macro targets, food selection rules, and AI coaching tone.

| Protocol | Target User | What Changes |
|---|---|---|
| Ketogenic | Low-carb preference | Carbs < 5% of calories, fat > 65%, food list filtered |
| Muscle Gain | Body recomp goal | Calorie surplus +300 kcal, protein > 35%, resistance training prompts |
| PCOS Protocol | Hormonal condition selected in onboarding | Anti-inflammatory foods, lower GI index target, cycle-phase notes |
| Menopause Protocol | Age > 45 + female in onboarding | Higher calcium/vitamin D focus, strength training emphasis |
| Intermittent Fasting | IF preference | Eating window config (16:8, 18:6), meal timing adjusted |

Protocol selection UI lives in `/settings/protocol`. Only visible to Pro+ users. Free/Pro users see it as a locked card with upgrade prompt.

### Advanced Coaching Features (Pro+)

**Weekly AI Check-In:** Every 7 days, a background job queries the user's logged meals and weight entries (if tracked) and generates a structured coaching summary via the AI services layer. Stored in `coaching_sessions` table. Surfaced in `/dashboard` as a notification card.

**Check-in content includes:**
- Adherence rate (% of days within calorie target)
- Macro balance assessment
- 1 personalized recommendation
- 1 habit reinforcement message
- Next week focus area

AI prompt template is stored in `ai-services/app/prompts/coaching_weekly.py` — not hardcoded in the endpoint. This allows prompt iteration without code deploys.

### Weekly AI Progress Report (Pro+)

Generated every 7 days. PDF format (or structured HTML rendered to PDF via headless Chromium on the AI services layer). Stored in Vercel Blob (or equivalent object storage), URL stored in `weekly_reports` table.

**Report sections:**
1. Weekly summary (calories in vs target, adherence %)
2. Weight trend chart (if user has logged weight)
3. Top 3 foods consumed
4. Macro balance visualization
5. AI coach narrative (2-3 paragraphs)
6. Next week recommendation

Report generation is triggered by a weekly cron job (`POST /api/v1/billing/generate-reports` gated by `CRON_SECRET`). Generation is async — user receives an in-app notification and email when ready.

---

## 8. Checkout Flow Design

### Pricing Page UX (`/pricing`)

New public route. Also accessible from within the app (e.g., `/settings/billing` for existing users).

**Layout (mobile-first, single column on mobile, 3-column on desktop):**

```
┌─────────────────────────────────────────────────────────┐
│         [Monthly / Annual toggle] ← default: Annual     │
├──────────────┬────────────────┬────────────────────────-┤
│     FREE     │      PRO       │        PRO+  ⭐BEST      │
│     $0       │  $9/mo         │  $19/mo                 │
│              │  $6.58/mo      │  $8.25/mo annually      │
│              │  annually      │  ← HERO CARD (bordered) │
├──────────────┴────────────────┴─────────────────────────┤
│  Feature comparison table (collapsed by default on mobile│
│  Expand: "See full comparison")                         │
└─────────────────────────────────────────────────────────┘
```

**Hero card (Pro+):** Elevated with branded border, "Most Popular" badge, slight scale transform. This is the visual anchor — all other cards defer to it.

**Toggle behavior:** Switching Monthly ↔ Annual rerenders prices inline. Annual view shows "Save X%" badge on Pro and Pro+. Annual is the default — users who want monthly must opt in.

### Checkout UX

Extends the existing `/funnel/upgrade` form (Phase 11). For users upgrading from within the app (already authenticated), a separate `/settings/billing/upgrade` page with the same Stripe Elements form but without the email/password fields.

**Form fields:**
- Card number (Stripe Elements — handles formatting automatically)
- Expiry (Stripe Elements)
- CVC (Stripe Elements)
- Payment Request Button (Apple Pay / Google Pay — renders automatically if browser supports it)
- Submit button: "Start [tier] — [price]"

**Payment Request Button (Apple Pay / Google Pay):**
Stripe's Payment Request API is browser-native. `stripe.paymentRequest()` checks if the device supports Apple Pay or Google Pay. If supported, renders a native button above the card form with an "or pay with card" divider below. On click, opens the native payment sheet. On success, the `paymentmethod` token is submitted to the same `POST /api/v1/funnel/convert` (or `/api/v1/billing/subscribe`) endpoint.

**No redirect:** Stripe Payment Intents + Stripe.js `confirmCardPayment` handles the full flow client-side. No Stripe Checkout redirect page. The checkout experience stays within the app.

### Post-Checkout

On successful payment:
1. Backend returns JWT (new users) or subscription update confirmation (existing users)
2. Frontend updates local subscription state
3. Redirect to `/funnel/welcome` (new users) or show inline success toast (existing users upgrading)
4. `conversion_completed` or `upgrade_completed` analytics event fired

---

## 9. Conversion Optimization

### Urgency Triggers

**On `/funnel/preview`** (Phase 11, already designed):
- Session countdown timer (24:00 → 0) in `sessionStorage`
- On expiry: CTA pulses, copy changes to "Your plan is ready — don't lose it"

**On `/pricing` and `/settings/billing/upgrade`**:
- Annual plan badge: "Prices may increase — lock in today's rate"
- Shown only when `NEXT_PUBLIC_PRICING_URGENCY_ENABLED=true` (can be toggled without deploy)
- No fake countdown timers on pricing page — urgency must be real or absent

**On paywall modal** (in-app):
- No urgency timer in modals — they appear too frequently to feel urgent
- Value-focused messaging instead (see Section 6)

### Trust Signals

Present consistently across `/funnel/upgrade`, `/pricing`, and paywall modals:

| Signal | Placement | Implementation |
|---|---|---|
| "Cancel anytime" | Below submit button | Static text |
| "Secure payment — SSL encrypted" | Below card form | Stripe badge + lock icon |
| "30-day money-back guarantee" | Below CTA on pricing | Static text |
| Star rating + review count | Hero area of pricing | `TestimonialStrip` component |
| Plan counter ("14,280 plans generated") | Pricing page | Same `PlanCounter` from Phase 11 |
| "No contracts, no commitment" | Annual plan card footer | Static text |

### A/B Testing Strategy

Extends existing `lib/ab-testing.ts` and `lib/feature-flags.ts`.

**Experiments to run (sequentially, not simultaneously):**

| Experiment ID | Variants | Primary Metric | Secondary Metric |
|---|---|---|---|
| `pricing_default_interval` | A: Monthly default, B: Annual default | Annual plan conversion rate | Overall checkout conversion |
| `pricing_hero_plan` | A: Pro hero, B: Pro+ hero | Pro+ conversion rate | ARPU |
| `paywall_modal_style` | A: Feature-focused, B: Outcome-focused copy | Upgrade modal → checkout conversion | |
| `cta_copy_upgrade` | A: "Unlock full plan", B: "Start free week" | Click-through rate on paywall CTA | |

**Implementation:**
- Variant assignment: client-side, `sessionStorage`, bucketed by `Math.random()` against rollout percentage
- Each variant fires an `experiment_viewed` event with `{experiment_id, variant}` properties
- Conversion events include `experiment_assignments` map as a property
- Analysis: query `conversion_events` grouped by `properties.experiment_assignments.[id]`
- No external A/B tool required — extends existing analytics infrastructure

**New env vars:**
```
NEXT_PUBLIC_AB_PRICING_INTERVAL_ENABLED=true
NEXT_PUBLIC_AB_PRICING_INTERVAL_ROLLOUT=50
NEXT_PUBLIC_AB_HERO_PLAN_ENABLED=false
NEXT_PUBLIC_AB_HERO_PLAN_ROLLOUT=50
```

---

## 10. Data Models

### Extended `user_subscriptions` (extends Phase 11)

```sql
ALTER TABLE user_subscriptions
  ADD COLUMN tier              VARCHAR NOT NULL DEFAULT 'free'
                               CHECK (tier IN ('free', 'pro', 'pro_plus')),
  ADD COLUMN interval          VARCHAR NOT NULL DEFAULT 'monthly'
                               CHECK (interval IN ('monthly', 'annual')),
  ADD COLUMN current_period_end TIMESTAMP,
  ADD COLUMN cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN cancelled_at      TIMESTAMP,
  ADD COLUMN stripe_price_id   VARCHAR;
-- status: already exists as enum (active | cancelled | past_due)
-- trial_started_at, trial_expires_at: already exist
```

### New: `pricing_plan`

Read-only reference table. Populated by a seed migration. Not user-facing rows.

```sql
CREATE TABLE pricing_plan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier            VARCHAR NOT NULL CHECK (tier IN ('free', 'pro', 'pro_plus')),
  interval        VARCHAR NOT NULL CHECK (interval IN ('monthly', 'annual')),
  price_cents     INTEGER NOT NULL,
  stripe_price_id VARCHAR NOT NULL UNIQUE,
  display_name    VARCHAR NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);
```

### New: `usage_tracking`

```sql
CREATE TABLE usage_tracking (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature     VARCHAR NOT NULL,  -- e.g., 'ai_plan_regeneration', 'coaching_insight'
  period_key  VARCHAR NOT NULL,  -- e.g., '2026-W15' (ISO week) or '2026-04-07' (day)
  count       INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, period_key)
);
```

Increment via `INSERT ... ON CONFLICT (user_id, feature, period_key) DO UPDATE SET count = count + 1`.

### New: `billing_event`

```sql
CREATE TABLE billing_event (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  stripe_event_id VARCHAR UNIQUE,          -- idempotency key
  event_type      VARCHAR NOT NULL,        -- Stripe event type string
  payload         JSONB NOT NULL,          -- full Stripe event object
  processed_at    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_billing_event_stripe_event_id ON billing_event(stripe_event_id);
CREATE INDEX idx_billing_event_user_id ON billing_event(user_id);
```

### New: `coaching_session`

```sql
CREATE TABLE coaching_session (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key        VARCHAR NOT NULL,         -- '2026-W15'
  adherence_rate  NUMERIC(5,2),
  content         JSONB NOT NULL,           -- structured coaching output
  generated_at    TIMESTAMP NOT NULL DEFAULT now(),
  viewed_at       TIMESTAMP,
  UNIQUE (user_id, week_key)
);
```

### New: `weekly_report`

```sql
CREATE TABLE weekly_report (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key        VARCHAR NOT NULL,
  blob_url        VARCHAR,                  -- object storage URL
  status          VARCHAR NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  generated_at    TIMESTAMP,
  notified_at     TIMESTAMP,
  UNIQUE (user_id, week_key)
);
```

---

## 11. APIs

### New Endpoints

All under `/api/v1/billing/`. Auth required (JWT) unless noted.

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/billing/plans` | GET | None | Return all active pricing plans + capabilities matrix |
| `/billing/subscribe` | POST | JWT | Create/change subscription for existing users |
| `/billing/cancel` | POST | JWT | Cancel subscription at period end |
| `/billing/reactivate` | POST | JWT | Reactivate a cancelled subscription before period end |
| `/billing/payment-method` | PUT | JWT | Update default payment method |
| `/billing/portal` | POST | JWT | Return Stripe Customer Portal session URL |
| `/billing/status` | GET | JWT | Return current subscription status + tier + capabilities |
| `/billing/stripe-webhook` | POST | Stripe-Signature header | Handle Stripe lifecycle events |
| `/billing/usage` | GET | JWT | Return usage counts for current period per feature |
| `/billing/generate-reports` | POST | CRON_SECRET header | Trigger weekly report generation (cron only) |

### Key Request / Response Shapes

**`POST /billing/subscribe`**
```json
Request:  { "tier": "pro_plus", "interval": "annual", "payment_method_id": "pm_xxx" }
Response: { "subscription_id": "sub_xxx", "tier": "pro_plus", "status": "active",
            "current_period_end": "2027-04-07T00:00:00Z" }
```

**`GET /billing/status`**
```json
{
  "tier": "pro_plus",
  "interval": "annual",
  "status": "active",
  "trial_active": false,
  "past_due": false,
  "cancel_at_period_end": false,
  "current_period_end": "2027-04-07T00:00:00Z",
  "capabilities": {
    "meal_plan_full": true,
    "weekly_schedule": true,
    "goal_specific_plans": true,
    "advanced_coaching": true,
    "weekly_ai_report": true
  }
}
```

**`GET /billing/plans`**
```json
{
  "plans": [
    { "tier": "free", "interval": null, "price_cents": 0, "display_name": "Free" },
    { "tier": "pro", "interval": "monthly", "price_cents": 900, "display_name": "Pro Monthly" },
    { "tier": "pro", "interval": "annual", "price_cents": 7900, "display_name": "Pro Annual" },
    { "tier": "pro_plus", "interval": "monthly", "price_cents": 1900, "display_name": "Pro+ Monthly" },
    { "tier": "pro_plus", "interval": "annual", "price_cents": 9900, "display_name": "Pro+ Annual" }
  ]
}
```

### Modified Endpoints

**`POST /api/v1/funnel/convert`** (Phase 11 — extended):
- Now accepts `tier` and `interval` in request body (defaults: `pro`, `monthly` if omitted)
- Selects `stripe_price_id` from `pricing_plan` based on tier + interval
- Creates Stripe Subscription with selected price ID

**`GET /api/v1/plans/today`** (existing — modified):
- Injects `require_capability("meal_plan_full")` dependency
- If gated (free, trial expired): returns `{ calories, macros }` only + `paywall` metadata
- If ungated: returns full plan as before

---

## 12. Execution Order

### Phase 1 — Stripe Setup (Foundation)
1. Create Stripe Products and Prices in Dashboard (all 4 price IDs)
2. Add all new env vars to `.env` and Vercel project settings
3. Create Alembic migration: extend `user_subscriptions`, add `pricing_plan`, `billing_event`, `usage_tracking`, `coaching_session`, `weekly_report`
4. Seed `pricing_plan` table (migration-time data, not fixture)
5. Implement `stripe_service.py` (customer create, subscription create/cancel/update, payment method update)
6. Implement `billing_event` idempotency check

### Phase 2 — Webhook Handler
7. Implement `POST /billing/stripe-webhook` with signature validation
8. Implement each webhook event handler (subscription.created/updated/deleted, invoice.paid/payment_failed)
9. Test with Stripe CLI: `stripe listen --forward-to localhost:8000/api/v1/billing/stripe-webhook`

### Phase 3 — Feature Gating
10. Implement `require_capability()` dependency in `backend/app/dependencies/billing.py`
11. Wire `require_capability` into all plan, coaching, and profile endpoints
12. Implement `UsageTracker` service + `usage_tracking` increment logic
13. Add `X-Usage-Warning` header logic to AI endpoints
14. Test gating: create free user, attempt gated request, expect 403 with paywall payload

### Phase 4 — Paywall Frontend
15. Implement `frontend/lib/paywall-messages.ts` (all capability → copy mappings)
16. Implement `<UpgradeModal>` component (used by API-triggered paywall)
17. Implement lock overlays on `/dashboard` (blurred day 2–7 meals, locked coaching section)
18. Wire `<UpgradeModal>` to `FEATURE_GATED` 403 handler in API client
19. Implement `/pricing` page (tier cards, Monthly/Annual toggle, feature table)

### Phase 5 — Checkout
20. Extend `/funnel/upgrade` Stripe Elements form to support Payment Request Button (Apple Pay / Google Pay)
21. Implement `/settings/billing/upgrade` page (for existing users upgrading in-app)
22. Implement `POST /billing/subscribe` endpoint
23. Implement `GET /billing/status` endpoint
24. Implement `PUT /billing/payment-method` endpoint
25. Implement `POST /billing/cancel` endpoint + cancellation confirmation UI in `/settings/billing`

### Phase 6 — Outcome-Based Features (Pro+)
26. Implement protocol selection UI in `/settings/protocol` (Pro+ only, upgrade prompt for others)
27. Implement protocol overlay logic in AI services (modify macro targets + food rules based on protocol)
28. Implement `POST /billing/generate-reports` cron endpoint + report generation service
29. Implement weekly coaching check-in generation + `coaching_session` storage
30. Implement weekly report delivery (notification card in dashboard + email link)

### Phase 7 — Conversion Optimization
31. Implement A/B experiment framework extensions in `lib/ab-testing.ts`
32. Add `pricing_default_interval` experiment to `/pricing`
33. Add `paywall_modal_style` experiment to `<UpgradeModal>`
34. Add trust signals to `/pricing` and upgrade form
35. Enable urgency banner on `/pricing` via `NEXT_PUBLIC_PRICING_URGENCY_ENABLED` flag
36. Wire all new analytics events

---

## 13. Documentation

### Architecture Explanation

The Phase 12 billing system is layered in three tiers:

**Infrastructure layer (Stripe):** Stripe owns payment processing, subscription scheduling, retry logic, and invoice generation. The backend is a thin wrapper — it creates Stripe objects and reacts to Stripe events via webhooks. Stripe is the source of truth for subscription state. The `user_subscriptions` table is a local cache of Stripe state, kept in sync by webhook events.

**Enforcement layer (backend):** The `get_subscription` FastAPI dependency reads `user_subscriptions` on every authenticated request. The `require_capability` dependency wraps it to enforce per-feature access. This means feature access is checked on every request — there is no client-side trust. A user cannot spoof a Pro subscription by modifying localStorage.

**Presentation layer (frontend):** The frontend reads subscription state from `GET /billing/status` on app load and caches it in React context. UI elements that are tier-gated render in a locked or disabled state based on this context. When a user clicks a locked element, the paywall modal appears. When an API call returns `FEATURE_GATED`, the API client intercepts it and triggers the same modal.

### Pricing Strategy Rationale

The pricing architecture is designed around three psychological principles:

1. **Annual as default:** The Annual toggle is pre-selected. Most users will price-compare on the annual rate ($6.58/mo Pro, $8.25/mo Pro+), which makes both tiers feel low-friction. Monthly pricing is available but presented as the "flexible" option, not the primary one.

2. **Pro+ as the hero:** Pro+ Annual ($99/yr) is the visually dominant card. At $8.25/mo equivalent, it is positioned as a category deal rather than a software subscription. The Pro Monthly ($9/mo) serves as a price anchor — users see Pro+ Annual and conclude they are getting Pro+ for slightly less than a single month of Pro.

3. **Free as a trial enabler:** The Free tier exists to reduce sign-up friction, not to be a sustainable product offering. Free users who reach the paywall have already invested in profile creation and plan generation — they have sunk cost and personalized data, which makes them more likely to convert.

### Stripe Integration Guide

**Setup steps (one-time):**

1. Create a Stripe account at stripe.com. Enable production mode when ready.
2. In Stripe Dashboard → Products: Create "Pro" and "Pro+" products. For each, add two prices: monthly and annual. Enable recurring billing. Note the `price_id` for each.
3. In Stripe Dashboard → Webhooks: Add endpoint `https://your-domain.com/api/v1/billing/stripe-webhook`. Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`. Copy the signing secret.
4. In Stripe Dashboard → Settings → Billing → Automatic collection: Enable Smart Retries (4 attempts over 7 days recommended). Enable automatic dunning emails.
5. Set all `STRIPE_*` env vars in backend `.env` and Vercel project environment variables.
6. In Stripe Dashboard → Payment methods: Enable Apple Pay and Google Pay for web payments. Upload domain verification file to `/.well-known/apple-developer-merchantid-domain-association`.

**Testing:**

Use `stripe listen --forward-to localhost:8000/api/v1/billing/stripe-webhook` during development to forward webhook events to your local server. Use Stripe test card numbers (`4242 4242 4242 4242` for success, `4000 0000 0000 9995` for decline). Trigger specific webhook scenarios with `stripe trigger invoice.payment_failed`.

### Feature Gating Rules

The gating system enforces two rules:

**Rule 1 — Backend always enforces.** Every API endpoint that returns gated content uses `require_capability`. The frontend lock UI is a UX hint, not a security control. If the backend enforcement is absent, a user can bypass the paywall with a direct API call.

**Rule 2 — Trial users get Pro access.** A user with `tier=free` and `trial_active=True` is treated as `tier=pro` by `require_capability`. The capability matrix is evaluated against the effective tier, not the stored tier. This allows trial users to access all Pro features without updating their tier to `pro`.

**Rule 3 — Past-due users retain access.** A user with `status=past_due` retains their tier access during the retry window (up to 7 days). This prevents accidental churn due to temporary payment failures. The frontend shows a "Payment failed" banner but does not lock content.

### Paywall Logic

The paywall has two entry points:

**1. Frontend-rendered locks (always visible, no interaction required):**
Locked content is blurred with a CSS filter + overlay. This is rendered unconditionally for free/expired users — no API call required to show the lock. The lock state is derived from the subscription context loaded at app startup.

**2. API-triggered paywall (on interaction):**
When a user attempts an action that requires a higher tier (e.g., requesting AI coaching), the API returns `403` with `{ code: "FEATURE_GATED", feature: "...", required_tier: "..." }`. The frontend API client catches this error code specifically (not all 403s) and renders `<UpgradeModal>` with context-specific copy from `paywall-messages.ts`.

The two entry points must stay in sync. If a feature is added to the backend capability matrix, the frontend lock UI must also be updated.

### Checkout Flow

The checkout form uses Stripe Elements (not Stripe Checkout redirect). This means:

- The payment form is embedded directly in the app
- No redirect to stripe.com
- Apple Pay and Google Pay are supported via the Payment Request Button API
- 3DS/SCA authentication is handled by `stripe.confirmCardPayment()` — Stripe opens a modal for banks that require it
- Card data never touches the app server — Stripe Elements tokenizes it client-side

The form submits to `POST /api/v1/funnel/convert` (new users) or `POST /api/v1/billing/subscribe` (existing users). Both endpoints:
1. Create/retrieve Stripe Customer
2. Attach PaymentMethod
3. Create/update Stripe Subscription
4. Return success or error

On Stripe error, the endpoint returns the Stripe error message (safe to display to users — Stripe error messages are user-friendly).

### Conversion Optimization

**A/B testing discipline:**
- Run one experiment at a time per page
- Run each experiment for a minimum of 2 weeks before drawing conclusions
- Minimum 200 conversions per variant before declaring a winner
- Use the existing `conversion_events` analytics to compare conversion rates by variant

**Urgency — ethical constraints:**
- Session countdown on `/funnel/preview` is honest: it represents the session expiry window (72h backend + 24h client-side display). The plan data is real and does expire. This is acceptable.
- Fake countdowns ("Offer expires in 04:32") on pricing pages are prohibited. They erode trust and violate consumer protection standards in multiple jurisdictions.
- "Prices may increase" messaging is permissible only if pricing actually is expected to change. Do not use it as a permanent fixture.

**Trust signal placement:**
- Every checkout form must show: "Cancel anytime" + SSL badge + money-back guarantee
- These are non-negotiable — removing them to reduce visual clutter will harm conversion more than help

---

## New File Tree

```
backend/app/
  api/v1/endpoints/
    billing.py                    All /billing/* endpoints (new)
  dependencies/
    billing.py                    require_capability, get_subscription (extended)
  models/
    billing.py                    PricingPlan, BillingEvent, UsageTracking,
                                  CoachingSession, WeeklyReport (new)
  schemas/
    billing.py                    Pydantic schemas for billing endpoints (new)
  services/
    stripe_service.py             Stripe API wrapper (new)
    usage_tracker.py              Usage counting + limit enforcement (new)
    report_generator.py           Weekly report generation (new)
    coaching_service.py           Weekly coaching check-in generation (new)

backend/alembic/versions/
  xxxx_phase12_billing_tables.py

frontend/app/
  pricing/
    page.tsx                      Public pricing page
    components/
      tier-card.tsx               Individual plan card
      pricing-toggle.tsx          Monthly / Annual toggle
      feature-comparison.tsx      Full feature table (collapsible on mobile)
  settings/
    billing/
      page.tsx                    Billing settings (current plan, cancel, update card)
      upgrade/
        page.tsx                  In-app upgrade form (Stripe Elements)
    protocol/
      page.tsx                    Goal protocol selection (Pro+ only)

frontend/components/
  paywall/
    upgrade-modal.tsx             API-triggered paywall modal
    lock-overlay.tsx              Partial content blur + lock icon
  billing/
    payment-request-button.tsx    Apple Pay / Google Pay wrapper
    stripe-card-element.tsx       Card form wrapper

frontend/lib/
  paywall-messages.ts             Capability → copy mapping
  subscription-context.tsx        React context for subscription state
  ab-testing.ts                   Extended with Phase 12 experiments (existing file)

frontend/app/funnel/upgrade/
  components/
    upgrade-form.tsx              Extended: adds Payment Request Button (existing file)
```

---

## Environment Variables — Phase 12 Complete List

```bash
# Stripe (backend only)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_PRO_PLUS_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_PLUS_ANNUAL_PRICE_ID=price_...

# Stripe (frontend — safe to expose)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Feature flags (frontend)
NEXT_PUBLIC_PRICING_URGENCY_ENABLED=false
NEXT_PUBLIC_AB_PRICING_INTERVAL_ENABLED=true
NEXT_PUBLIC_AB_PRICING_INTERVAL_ROLLOUT=50
NEXT_PUBLIC_AB_HERO_PLAN_ENABLED=false
NEXT_PUBLIC_AB_HERO_PLAN_ROLLOUT=50

# Cron security (backend)
CRON_SECRET=...

# Phase 11 (already required)
NEXT_PUBLIC_LANDING_AB_ENABLED=true
NEXT_PUBLIC_LANDING_AB_ROLLOUT=50
```

---

## Key Decisions

1. **No Stripe Checkout redirect.** Stripe Elements embedded in-app for full UX control and Apple Pay / Google Pay support without leaving the app.

2. **Webhook-driven state, not polling.** Subscription state in `user_subscriptions` is only updated via webhook events. The backend never calls Stripe to check subscription status during a user request — it reads the local cache. This makes request latency deterministic.

3. **Pro+ Annual as the hero plan.** The $99/yr price anchors Pro and Pro Monthly as comparatively expensive. It maximizes ARPU on converted users.

4. **Trial access = Pro tier.** Simplifies gating logic. Avoids a separate `trial` tier in the capability matrix.

5. **Soft limits via `usage_tracking`, not hard blocks.** AI feature limits are enforced with warnings before the hard cap to reduce user frustration. Hard blocks are a last resort.

6. **Annual plan is the default on the pricing page.** Requires users to opt into monthly. Structurally favors higher LTV.

7. **Cancellation at period end, not immediate.** Stripe `cancel_at_period_end=True` means users get what they paid for. Immediate cancellation with partial refunds is operationally complex and not worth the edge-case handling.

---

## Assumptions

- Stripe is available in the target market(s). If launching in India or other restricted markets, payment provider alternatives (Razorpay, etc.) will need to be evaluated separately.
- Apple Pay domain verification requires a verified custom domain on Vercel. `localhost` is not supported by Apple Pay.
- The weekly report PDF generation requires headless Chromium on the AI services layer, or a third-party PDF service (e.g., Gotenberg). Implementation choice is deferred to execution.
- Email delivery for dunning and report notifications uses the existing email infrastructure (or Resend if not yet set up).
- The existing analytics infrastructure (`lib/analytics.ts`, `conversion_events`) is sufficient to support A/B experiment analysis without an external analytics tool.

---

## Confidence

| Area | Confidence | Notes |
|---|---|---|
| Stripe integration architecture | High | Standard patterns, well-documented |
| Subscription lifecycle (webhooks) | High | Idempotency pattern is proven |
| Feature gating (backend) | High | Simple dependency injection |
| Apple Pay / Google Pay | Medium | Domain verification required; test early |
| Weekly report PDF generation | Medium | Implementation approach TBD (Chromium vs third-party) |
| A/B testing statistical validity | Medium | Depends on traffic volume; small apps may need longer windows |
| Pro+ coaching content quality | Medium | AI prompt quality determines perceived value |

---

## Review Checklist

- ✅ Task 12.1.1 — Stripe integration: Products, price IDs, webhook handler
- ✅ Task 12.1.2 — Subscription lifecycle: creation, cancellation, renewals, failed payments
- ✅ Task 12.2.1 — Feature gating: capability matrix, middleware, soft limits
- ✅ Task 12.2.2 — Paywall optimization: partial locking, contextual prompts, value messaging
- ✅ Task 12.2.3 — Outcome-based monetization: goal-specific plans, advanced coaching, weekly AI reports
- ✅ Task 12.3.1 — Checkout experience: pricing page, Stripe Elements, Apple Pay / Google Pay
- ✅ Task 12.3.2 — Conversion optimization: urgency triggers, trust signals, A/B testing
- ✅ All data models defined
- ✅ All APIs defined
- ✅ Execution order specified (7 phases)
- ✅ Documentation complete
- ✅ Engineering rules stated
- ✅ Environment variables listed
