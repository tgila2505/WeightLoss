# Viral Growth System

## Overview

The Viral Growth System enables organic user acquisition through referrals, shareable plans, and a public leaderboard.

## Components

### Referral System

**Flow:**
1. Authenticated user visits `/api/v1/referrals/me` → gets (or creates) an 8-character referral code
2. User shares `<origin>/referral/<CODE>` link
3. Visitor hits `frontend/app/referral/[code]/route.ts` → click is tracked → redirected to `/register?ref=CODE`
4. Register page stores `ref_code` in `localStorage`
5. On form submit, `ref_code` is sent with registration request
6. Backend: `assign_referral_to_user` records the signup event; `apply_signup_reward` grants 7 premium days to new user
7. PostHog `referral_signup` event is fired with the `ref_code`

**Rewards:**
- New referred user: 7 premium days (`apply_signup_reward`)
- Referrer on paid conversion: 7 premium days (`apply_conversion_reward`)
- Monthly cap: 20 rewards per referrer per calendar month
- Idempotent: `RewardLog.referral_event_id` (unique) prevents double-rewarding

**API endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/referrals/me` | Required | Get/create user's referral code |
| GET | `/api/v1/referrals/me/stats` | Required | Clicks, signups, conversions, rewards |
| POST | `/api/v1/referrals/click/{code}` | None | Track a link click (IP-deduplicated, 1h window) |

### Shareable Plans

Users can generate a public link to their current weight loss plan.

**Flow:**
1. User clicks "Share your plan" button on `/plan`
2. `POST /api/v1/shared-plans` creates a `SharedPlan` with a 16-char random slug
3. Share URL: `<origin>/shared-plan/<SLUG>`
4. Public page renders plan details + "Get my free plan" CTA → `/register`
5. OG image auto-generated at `/api/og/<SLUG>` (1200×630, used in social share previews)

**API endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/shared-plans` | Required | Create a shared plan |
| GET | `/api/v1/shared-plans/me` | Required | List user's shared plans |
| GET | `/api/v1/shared-plans/{slug}` | None | View a plan (increments view count) |
| DELETE | `/api/v1/shared-plans/{slug}` | Required (owner) | Deactivate a plan |

### Leaderboard

Public page at `/leaderboard` showing top users by kg lost (opt-in only).

**Privacy:** Email addresses are masked as `al***@exa***.com`.

**Opt-in:** Set `leaderboard_opt_in = true` on the `User` model (profile settings, not yet wired to UI).

**Caching:** Server-side rendered with `revalidate: 300` (5 minutes).

## Database Models

| Model | Table | Key fields |
|-------|-------|------------|
| `Referral` | `referrals` | `referrer_user_id`, `code` (8 chars), `is_active` |
| `ReferralEvent` | `referral_events` | `referral_id`, `event_type` (CLICK/SIGNUP/PAID_CONVERSION), `referred_user_id`, `ip_hash` |
| `RewardLog` | `reward_logs` | `user_id`, `referral_event_id` (unique), `reward_type`, `reward_value`, `status` |
| `SharedPlan` | `shared_plans` | `user_id`, `slug` (16 chars, unique), `plan_data` (JSON), `views`, `expires_at` |

**User model additions:** `premium_until` (DateTime), `leaderboard_opt_in` (Boolean, default false).

## Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ShareButton` | `components/viral/ShareButton.tsx` | "Share your plan" CTA — creates link + copies to clipboard |
| `ReferralWidget` | `components/viral/ReferralWidget.tsx` | Dashboard widget showing referral link + stats |
| `useReferral` | `hooks/use-referral.ts` | Hook for referral stats + link generation |
| `useSharePlan` | `hooks/use-share-plan.ts` | Hook for creating shareable plan links |

## Analytics Events

| Event | When | Properties |
|-------|------|------------|
| `referral_signup` | New user registers via referral | `{ ref_code }` |
| `referral_paid_conversion` | User upgrades to paid (fire when payment is implemented) | `{ ref_code, user_id }` |
