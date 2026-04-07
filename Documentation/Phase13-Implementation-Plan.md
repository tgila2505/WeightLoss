# Phase 13 — Engagement & Retention System
## Implementation Plan

**Date:** 2026-04-07
**Status:** Ready for Implementation
**Scope:** Tasks 13.1 → 13.3 — Habit loop, progress tracking, notifications, gamification, AI reporting
**Depends on:** Phase 11 (funnel, user accounts, `user_subscriptions`, analytics), Phase 12 (feature gating via `require_capability`, AI services layer, `coaching_session`)

---

## 1. System Architecture

### Overview

The retention system is built around a single behavioral loop repeated every 24 hours:

```
Trigger → Check-In → AI Feedback → Recommendation → Reward → Next Trigger
   ↑                                                              │
   └──────────────── Streak + Notification System ───────────────┘
```

Five subsystems coordinate to sustain this loop:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      HABIT LOOP ENGINE                              │
│  Manages daily check-in state, idempotency, streak continuity       │
│  Tables: habit_log, streak_record                                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ check-in submitted
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   AI FEEDBACK ENGINE                                │
│  Generates immediate insight + today's meal recommendation          │
│  Uses: AI Gateway → ai-services layer → cached in habit_log        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ data accumulated
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  PROGRESS TRACKING SYSTEM                           │
│  Time-series weight + adherence data, trend analysis, goal deltas   │
│  Tables: progress_entry                                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ patterns detected
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   AI REPORTING SYSTEM                               │
│  Weekly report generation, plan recalibration, behavioral insights  │
│  Tables: ai_report (extends Phase 12 coaching_session)             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ engagement signals
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│               NOTIFICATION + GAMIFICATION SYSTEM                    │
│  Push/email nudges, streak tracking, badges, milestones             │
│  Tables: notification_event, streak_record                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Full Data Flow

```
USER INPUT
  → POST /api/v1/habits/checkin
      → Validate idempotency (one check-in per user per UTC day)
      → Write habit_log row
      → Update progress_entry (weight data point)
      → Increment streak_record or reset if gap > 1 day
      → Award streak milestone badge if threshold hit
      → Dispatch async job: generate_ai_feedback(habit_log.id)

ASYNC AI FEEDBACK JOB
  → Read habit_log + last 7 progress_entries
  → Call ai-services: POST /internal/feedback/daily
      → AI Gateway → model: 'anthropic/claude-sonnet-4-6'
      → Returns: insight text, meal recommendation, mood commentary
  → Write feedback to habit_log.ai_feedback (JSONB)
  → Push WebSocket event to user's session (if connected)
  → Fall back to polling endpoint if WebSocket unavailable

PROGRESS TRACKING
  → GET /api/v1/progress/summary (called on /dashboard load)
      → Reads progress_entry time series
      → Computes: trend slope, plateau detection, goal delta
      → Returns pre-computed stats (cached 10 min, invalidated on new check-in)

NOTIFICATION TRIGGER
  → Cron job runs at user's preferred_notification_time (default: 08:00 local)
      → For each user: check if today's habit_log exists
      → If missing: queue "daily reminder" notification
      → If streak endangered (last check-in was yesterday): queue "streak at risk" notification
      → If goal proximity < 10%: queue "almost there" nudge

WEEKLY REPORT JOB
  → Cron: every Sunday 06:00 UTC
      → For each Pro+ user: generate ai_report for the week
      → For Pro users: generate lightweight summary (no PDF, in-app only)
```

---

## 2. Habit Loop Design

### The Loop

Every retention system is only as strong as its habit loop. The Phase 13 loop is designed around **Nir Eyal's Hook Model** (trigger → action → variable reward → investment):

```
TRIGGER          → Notification at preferred time, OR streak counter visible in nav
ACTION           → Daily check-in (weight + mood + adherence) — max 60 seconds
VARIABLE REWARD  → AI feedback is personalized + slightly unpredictable (not formulaic)
INVESTMENT       → User builds a streak, accumulates progress history, earns badges
```

The loop closes when the investment (streak, history) increases the salience of the next trigger. A user with a 14-day streak notices and responds to the daily notification more reliably than a user on day 1.

### Daily Engagement Cycle

```
08:00 local  →  "Time for your daily check-in" notification fires
                (skipped if check-in already submitted today)

User opens app  →  Check-in card is the first element on /dashboard
                   (only shown if no check-in today; disappears after submission)

Check-in (< 60s)  →  Weight (optional) + Mood (5-point emoji scale) + Adherence (yes/partial/no)
                     Submit → immediate optimistic UI update

AI feedback arrives (< 3s target)  →  Inline card below check-in:
                                       Insight: "Your 3-day adherence rate is 87%. That's your best stretch."
                                       Today's focus: "Prioritize protein at breakfast — you've been 18g short."
                                       Meal suggestion: generated based on goal + history + today's macro gap

Evening nudge (optional, 20:00)  →  "Did you stick to your plan today?" — 1-tap update if adherence not logged
```

---

## 3. Core Habit System

### Daily Check-In (Task 13.1.1.1)

**UX:** Single card on `/dashboard`, always the first element if check-in is missing for today. Three fields:

| Field | Input Type | Required | Notes |
|---|---|---|---|
| Weight | Number input (kg or lbs, user preference) | No | Skippable to reduce friction |
| Mood | 5-emoji selector (😞😕😐🙂😄) | Yes | Single tap |
| Adherence | 3-button toggle (On track / Partial / Off track) | Yes | Single tap |

Weight is optional — forced weight entry causes drop-off. Mood and adherence are mandatory minimum signals.

**Idempotency:** One check-in per `user_id` per UTC calendar day. `habit_log` has a `UNIQUE (user_id, log_date)` constraint. `POST /api/v1/habits/checkin` uses `INSERT ... ON CONFLICT DO UPDATE` — re-submitting the same day updates the row, does not create a duplicate. This is important: editing a submitted check-in (e.g., correcting a weight entry) must be allowed without creating a new streak entry.

**Optimistic UI:** Frontend immediately renders the "Check-in submitted" state and AI feedback skeleton on submit. No spinner blocking the interaction. AI feedback arrives asynchronously and fills the skeleton within 1–3 seconds.

### Daily AI Feedback Loop (Task 13.1.1.2)

AI feedback is generated asynchronously after check-in submission to hit the < 1s UI response target (the UI responds instantly; the AI content loads within 3s).

**Feedback structure (JSONB stored in `habit_log.ai_feedback`):**

```json
{
  "insight": "Your adherence rate over the past 3 days is 87% — your strongest stretch yet.",
  "adjustment": null,
  "encouragement": "You're 1.2kg from your first milestone. Keep this up through the weekend.",
  "meal_focus": "You've been ~18g short on protein most mornings. Try adding eggs or Greek yogurt at breakfast.",
  "generated_at": "2026-04-07T08:14:22Z",
  "model": "anthropic/claude-sonnet-4-6"
}
```

**AI prompt inputs (sent to ai-services layer):**
- Last 7 `habit_log` entries (mood, adherence, weight if logged)
- Current calorie + macro targets (from plan)
- Progress toward goal weight (current vs target)
- Streak length
- Day of week (weekend/weekday context affects recommendations)

**Response caching:** The AI feedback for a given `habit_log.id` is generated once and stored. If the user refreshes the dashboard, the stored feedback is returned immediately — no second AI call.

### "What Should I Eat Today?" (Task 13.1.1.3)

A persistent button in the dashboard and `/plan` page. Not tied to check-in — available anytime.

**Behavior:**
- Calls `POST /api/v1/habits/meal-suggestion`
- Backend reads: today's habit_log (if exists), user's macro targets, recent 3-day food pattern (if food logging is enabled), any active goal protocol (Phase 12 Pro+ feature)
- AI generates a concrete meal suggestion for the next meal (breakfast if morning, lunch if midday, dinner if evening) based on server timestamp + user timezone
- Response is a structured suggestion: meal name + 3–4 foods + macro breakdown + prep note
- Cached per user per half-day period (morning cache / afternoon cache) to prevent duplicate AI calls on refresh

**Feature gating:** Available to all tiers. Free users get 1 suggestion/day. Pro and Pro+ get unlimited. Uses Phase 12 `UsageTracker` for free-tier limiting.

---

## 4. Progress Tracking System

### Weight Tracking Graph (Task 13.1.2.1)

Time-series visualization on `/progress` page.

**Data source:** `progress_entry` table (one row per check-in that includes a weight value). Rendered as a line chart with:
- Raw data points (small dots)
- 7-day rolling average line (smoothed trend)
- Goal weight as a horizontal dashed reference line
- Shaded zone between current trend and goal weight (visual distance remaining)

**Chart library:** Use a lightweight option (Recharts or Chart.js) — no heavy D3 unless already in the stack. Mobile-friendly: touch-scrollable on small screens.

**Time range selector:** 7D / 30D / 90D / All time. Default: 30D.

**Empty state:** If < 3 data points, show: "Log your weight in your daily check-in to see your trend. You need at least 3 entries."

### AI-Generated Progress Insights (Task 13.1.2.2)

Displayed below the chart on `/progress`. Generated weekly (same cron as weekly report), cached in `ai_report` table. Not real-time — the chart data is real-time, the narrative is weekly.

**Insight content:**
- **Trend summary:** "You've lost 1.8kg in the last 30 days — on pace for your 3kg/month goal."
- **Plateau detection:** Triggered when 7-day rolling average changes < 0.3kg over 14 days. "Your weight has been stable for 12 days. This is a common plateau — your body is adjusting. Try one of these: [increase protein, add a rest day, reduce sodium for 3 days]."
- **Positive reinforcement:** Highlight best adherence streak, fastest week of progress.
- **Projection:** "At your current rate, you'll reach [goal_weight]kg in approximately [N] weeks."

**Plateau detection algorithm:**
```
slope = linear_regression(progress_entry.weight, last 14 days)
if abs(slope) < 0.3 kg/14 days → plateau = True
```
Computed server-side on `GET /api/v1/progress/summary`, cached 10 minutes.

### Goal Tracking System (Task 13.1.2.3)

**Goal delta card** — always visible on `/dashboard`:

```
Your Goal: 75.0 kg        Start: 92.0 kg
Progress:  ████████░░░░  8.2 kg lost of 17.0 kg  (48%)
Est. completion: ~9 weeks at current pace
```

Goal weight and timeline set during onboarding (Phase 11). Editable in `/settings/goals` (Pro tier). Free users can view but not update goals.

---

## 5. Notification System

### Channels

| Channel | Use Case | Implementation |
|---|---|---|
| Push (Web Push API) | Time-sensitive reminders, streak alerts | Service worker + Push API. Permission requested after first successful check-in (not on signup — too early). |
| Email | Weekly reports, missed check-in recovery (D2+), goal milestones | Existing email infrastructure (Resend or equivalent). Max 1 email/day per user. |
| In-app (notification bell) | Badge achievements, AI report ready, plan adjustments | `notification_event` table read on dashboard load. Badge count in nav. |

### Notification Types

| Type | Channel | Trigger | Timing Rule |
|---|---|---|---|
| Daily reminder | Push + in-app | No check-in by `preferred_notification_time` | Once per day, at user's preferred time (default 08:00 local). Skip if already checked in. |
| Streak at risk | Push | Last check-in was yesterday; no check-in today by 20:00 local | Once per day, 20:00 only. Not sent if daily reminder was ignored (no open). Avoids double spam. |
| Goal proximity nudge | Push + in-app | `goal_delta_kg <= 2.0` AND not sent in last 7 days | Once per week max. |
| Missed check-in recovery | Email | No check-in for 2 consecutive days | Email at 10:00 UTC on day 3. Subject: "We haven't seen you in a couple of days — here's where you are." |
| Weekly report ready | Email + in-app | Weekly report generation complete | Fired by report generation job on completion. |
| Streak milestone | Push + in-app | Streak reaches 7, 14, 30, 60, 100 days | Immediately on check-in submission that hits threshold. |
| Plan adjustment | In-app | AI weekly report contains a plan recalibration | Dashboard card on next app open. |

### Smart Timing Rules

1. **No notifications before 07:00 or after 21:00 local time.** Requires storing `user_timezone` (set during onboarding from browser `Intl.DateTimeFormat().resolvedOptions().timeZone`).
2. **Daily notification cap: 2 pushes per day maximum.** If both daily reminder and streak-at-risk would fire, send streak-at-risk only (higher urgency).
3. **Email cap: 1 email per day.** Weekly report email supersedes missed-check-in email on the same day.
4. **Opt-out respected immediately.** `notification_preferences.push_enabled = false` is checked before every push dispatch. No background job should ever queue a notification before checking preferences.
5. **Re-engagement sequence (email only):** User inactive for 7 days → day 7 email ("Your streak is waiting"). Day 14 email ("Here's what you've missed"). Day 30 email ("Your plan needs an update — let's recalibrate"). No more emails after day 30 unless user re-engages.

### Notification Preferences

Stored in `notification_preferences` table (one row per user):

```
push_enabled            BOOLEAN DEFAULT true
email_enabled           BOOLEAN DEFAULT true
preferred_push_time     TIME DEFAULT '08:00'
user_timezone           VARCHAR DEFAULT 'UTC'
daily_reminder_enabled  BOOLEAN DEFAULT true
streak_alerts_enabled   BOOLEAN DEFAULT true
marketing_emails        BOOLEAN DEFAULT false
```

UI in `/settings/notifications`. All toggles visible and editable.

---

## 6. Gamification System

### Daily Streak Tracking (Task 13.2.2.1)

A streak is a consecutive sequence of UTC calendar days with at least one submitted check-in.

**Streak rules:**
- A check-in on day N and day N+1 continues the streak.
- A gap of exactly 1 day (missed day N, checked in day N-1 and N+1) breaks the streak. No grace days for missing — this is intentional; grace days erode the psychological value of the streak.
- Streak count is stored in `streak_record.current_streak` and `streak_record.longest_streak`.
- `streak_record.last_checkin_date` is updated on each check-in. Streak continuation is computed: `last_checkin_date == today - 1 day → continue; last_checkin_date == today → already checked in; otherwise → reset to 1`.

**Streak display:** Visible in the nav bar (small flame icon + count). Also shown prominently at the top of the check-in card: "🔥 12-day streak — don't break it!"

**Streak freeze (Pro+ only):** One streak freeze available per month. Applied automatically when a user with Pro+ misses a day (preserves the streak, does not reset). Shown as a "freeze used" note the next day. This is a retention lever — losing a long streak is the #1 reason users quit gamified apps.

### Reward Milestones (Task 13.2.2.2)

Milestones are one-time achievements triggered at threshold events. Not points-based — milestone-based.

| Milestone | Trigger | Reward Display |
|---|---|---|
| First Check-In | First ever submitted check-in | "Welcome — you've started your journey." |
| 1 Week Streak | 7-day consecutive streak | "One week of consistency. That's how habits form." |
| 1 Month Streak | 30-day streak | "30 days. Most people quit by day 10. You didn't." |
| First Kilo | progress_entry shows 1kg loss vs start | "1kg down. Your body is responding." |
| Halfway There | goal_delta = 50% of start_delta | "You're halfway to [goal_weight]kg." |
| Goal Reached | current_weight ≤ goal_weight | "You did it. What's your next goal?" |
| 10 Check-Ins | 10th lifetime check-in | "Building the habit." |
| 50 Check-Ins | 50th lifetime check-in | "50 check-ins. That's real data about your body." |

Milestone events are stored in `notification_event` with `type = 'milestone'`. They show as a celebratory card on the dashboard (auto-dismissed after 3 views, or on tap).

### Engagement Badges (Task 13.2.2.3)

Badges are persistent and displayed on the user's profile `/settings/profile`. They are collectible but not instrumental — they do not unlock features. Their purpose is social proof (to the user themselves) and reinforcement.

| Badge | Earn Condition |
|---|---|
| 🔥 Habit Builder | 7-day streak |
| 🏆 Consistent | 30-day streak |
| 💎 Committed | 60-day streak |
| ⚡ Unstoppable | 100-day streak |
| 📉 First Drop | First weight loss logged |
| 🎯 Halfway | 50% of goal reached |
| 🏁 Goal Achieved | Goal weight reached |
| 📊 Data Nerd | 10+ weight entries |
| 🤖 AI Explorer | Used "What should I eat today?" 10 times |
| 📅 Weekly Warrior | Completed all 7 check-ins in a calendar week |

Badges are stored as a JSONB array in `streak_record.badges_earned` or a separate `user_badge` join table (join table preferred for queryability). Awarded immediately on trigger condition being met during check-in processing.

---

## 7. AI Reporting System

### Weekly Progress Report (Task 13.3.1.1)

Generated every Sunday for the past 7-day period. Stored in `ai_report` table. Surfaced in `/progress` and `/dashboard` as a card.

**Report sections:**

1. **Week summary** — Adherence rate (%), check-in completion (X/7 days), weight change (±Xkg)
2. **Best day** — Day with highest mood + adherence combination
3. **Hardest day** — Day with lowest adherence (with non-judgmental framing)
4. **Trend narrative** — 2–3 sentences from AI: what the data says about the week
5. **Top insight** — One specific, actionable observation (e.g., "Your Monday adherence is consistently your lowest — consider adjusting your Monday meal plan to be simpler.")
6. **Next week focus** — One behavioral goal for the coming week (specific and measurable)

For **Pro+ users:** Report also includes:
- Macro breakdown (protein/carbs/fat adherence vs targets)
- Weight trend chart snapshot (PNG embedded in email)
- Protocol-specific observations (if goal protocol active from Phase 12)
- Comparison to previous week

For **Pro users:** Core sections only. No PDF. In-app card only (no email attachment, just email notification with link to app).

For **Free users:** No weekly report. The report card on `/progress` is shown as a locked feature with upgrade prompt.

### Plan Adjustments (Task 13.3.1.2)

**Dynamic recalibration** — the AI weekly report may include a plan adjustment recommendation. Conditions that trigger recalibration:

| Condition | Trigger | Adjustment |
|---|---|---|
| Plateau detected (14+ days < 0.3kg loss) | Weight plateau algorithm | Suggest calorie cycle (2-day refeed) or macro rebalance |
| Consistently below calorie target | Avg adherence < 70% for 2 weeks | Simplify meal plan, reduce calorie deficit slightly |
| Consistently over calorie target | Avg adherence notes "Off track" 5+ days/2wks | Identify problem meal (AI asks: "Which meal do you find hardest to stick to?") |
| Goal weight reached | `current_weight ≤ goal_weight` | Prompt to set maintenance calories or new goal |
| Timeline exceeded | `estimated_completion > original_timeline * 1.5` | Recalibrate timeline expectations + offer protocol adjustment |

Plan adjustments are stored in `ai_report.adjustments` (JSONB). They surface as a dismissible dashboard card: "Your coach has updated your plan — see what changed." The user must explicitly accept the adjustment for it to be applied to their active plan.

### Behavioral Insights (Task 13.3.1.3)

Aggregated cross-week pattern analysis. Generated monthly (first of each month) for Pro+ users, quarterly for Pro users.

**Insight types identified:**

- **Weak habit patterns:** "You consistently miss check-ins on weekends (Saturday/Sunday check-in rate: 34% vs 91% weekday)."
- **Strong patterns:** "Your longest adherence runs always start on Monday. Consider using Sunday evening to prep."
- **Mood-adherence correlation:** "Your mood is rated 😄 on days when you hit your protein target. Missing protein correlates with 😕 mood on 78% of days."
- **Time-of-day pattern:** "You log food 80% of the time before 20:00. Days where first food log is after 20:00 show 40% lower adherence."

These insights are stored in `ai_report` with `report_type = 'behavioral_insights'` and surfaced in `/progress` under a "Patterns" tab.

---

## 8. Data Models

### `habit_log`

```sql
CREATE TABLE habit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL,
  mood            SMALLINT CHECK (mood BETWEEN 1 AND 5),
  adherence       VARCHAR CHECK (adherence IN ('on_track', 'partial', 'off_track')),
  weight_kg       NUMERIC(5,2),
  notes           TEXT,
  ai_feedback     JSONB,            -- populated async after submission
  ai_generated_at TIMESTAMP,
  submitted_at    TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)        -- idempotency constraint
);
CREATE INDEX idx_habit_log_user_date ON habit_log(user_id, log_date DESC);
```

### `progress_entry`

```sql
CREATE TABLE progress_entry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  weight_kg       NUMERIC(5,2),
  body_fat_pct    NUMERIC(4,1),      -- optional, for future expansion
  notes           TEXT,
  source          VARCHAR NOT NULL DEFAULT 'checkin'
                  CHECK (source IN ('checkin', 'manual', 'device_sync')),
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
CREATE INDEX idx_progress_entry_user_date ON progress_entry(user_id, entry_date DESC);
```

### `notification_event`

```sql
CREATE TABLE notification_event (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR NOT NULL,   -- 'daily_reminder' | 'streak_at_risk' | 'milestone'
                                      -- | 'goal_proximity' | 'report_ready' | 'plan_adjustment'
  channel         VARCHAR NOT NULL CHECK (channel IN ('push', 'email', 'in_app')),
  title           VARCHAR NOT NULL,
  body            TEXT,
  payload         JSONB,              -- extra data (e.g., badge earned, report_id)
  sent_at         TIMESTAMP,
  opened_at       TIMESTAMP,
  dismissed_at    TIMESTAMP,
  status          VARCHAR NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'dismissed')),
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_event_user ON notification_event(user_id, created_at DESC);
CREATE INDEX idx_notification_event_status ON notification_event(status) WHERE status = 'pending';
```

### `streak_record`

```sql
CREATE TABLE streak_record (
  user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  longest_streak      INTEGER NOT NULL DEFAULT 0,
  last_checkin_date   DATE,
  streak_freeze_used  BOOLEAN NOT NULL DEFAULT false,
  freeze_resets_at    DATE,           -- first day of next month
  total_checkins      INTEGER NOT NULL DEFAULT 0,
  badges_earned       JSONB NOT NULL DEFAULT '[]',
  updated_at          TIMESTAMP NOT NULL DEFAULT now()
);
```

### `ai_report`

```sql
CREATE TABLE ai_report (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type     VARCHAR NOT NULL CHECK (report_type IN ('weekly', 'behavioral_insights', 'plan_adjustment')),
  period_key      VARCHAR NOT NULL,   -- '2026-W15' for weekly, '2026-04' for monthly
  content         JSONB NOT NULL,     -- structured report output
  adjustments     JSONB,              -- plan recalibration proposals (nullable)
  adjustment_accepted_at TIMESTAMP,
  status          VARCHAR NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  generated_at    TIMESTAMP,
  blob_url        VARCHAR,            -- PDF URL for Pro+ (if applicable)
  notified_at     TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_type, period_key)
);
CREATE INDEX idx_ai_report_user ON ai_report(user_id, created_at DESC);
```

### `notification_preferences`

```sql
CREATE TABLE notification_preferences (
  user_id                 INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled            BOOLEAN NOT NULL DEFAULT true,
  email_enabled           BOOLEAN NOT NULL DEFAULT true,
  preferred_push_time     TIME NOT NULL DEFAULT '08:00',
  user_timezone           VARCHAR NOT NULL DEFAULT 'UTC',
  daily_reminder_enabled  BOOLEAN NOT NULL DEFAULT true,
  streak_alerts_enabled   BOOLEAN NOT NULL DEFAULT true,
  goal_nudges_enabled     BOOLEAN NOT NULL DEFAULT true,
  marketing_emails        BOOLEAN NOT NULL DEFAULT false,
  push_subscription       JSONB,      -- Web Push API subscription object
  updated_at              TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## 9. APIs

### New Endpoints

All under `/api/v1/`. JWT auth required unless noted.

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/habits/checkin` | POST | JWT | Submit or update today's check-in |
| `/habits/checkin/today` | GET | JWT | Fetch today's check-in + AI feedback (if generated) |
| `/habits/meal-suggestion` | POST | JWT | Request "what should I eat today?" AI suggestion |
| `/habits/feedback/status` | GET | JWT | Poll for AI feedback generation status (fallback if WebSocket unavailable) |
| `/progress/summary` | GET | JWT | Return trend data, goal delta, plateau status, stats for dashboard |
| `/progress/entries` | GET | JWT | Paginated weight history for chart (supports `?from=&to=&limit=`) |
| `/progress/entries` | POST | JWT | Manual progress entry (weight without check-in) |
| `/gamification/status` | GET | JWT | Return streak, badges, milestone progress |
| `/notifications/preferences` | GET / PUT | JWT | Read/update notification preferences |
| `/notifications/push/subscribe` | POST | JWT | Register Web Push subscription object |
| `/notifications/push/unsubscribe` | DELETE | JWT | Remove push subscription |
| `/notifications/inbox` | GET | JWT | Return unread in-app notifications (badge count + list) |
| `/notifications/inbox/:id/dismiss` | POST | JWT | Dismiss an in-app notification |
| `/reports/weekly` | GET | JWT | Return latest weekly report for user |
| `/reports/weekly/:period_key` | GET | JWT | Return report for specific week |
| `/reports/accept-adjustment` | POST | JWT | Accept a plan adjustment from a report |
| `/reports/generate` | POST | CRON_SECRET | Trigger weekly report generation (cron only) |
| `/reports/behavioral` | GET | JWT | Return latest behavioral insights report |

### Key Request / Response Shapes

**`POST /habits/checkin`**
```json
Request:  { "mood": 4, "adherence": "on_track", "weight_kg": 87.3, "notes": "" }
Response: {
  "log_date": "2026-04-07",
  "streak": { "current": 13, "longest": 21, "milestone_earned": null },
  "ai_feedback_status": "generating",  // or "ready" if cached from earlier today
  "ai_feedback": null                  // populated if status = "ready"
}
```

**`GET /habits/checkin/today`**
```json
Response: {
  "submitted": true,
  "log_date": "2026-04-07",
  "mood": 4,
  "adherence": "on_track",
  "weight_kg": 87.3,
  "ai_feedback": {
    "insight": "Your 3-day adherence is 87% — your strongest stretch.",
    "meal_focus": "Add protein at breakfast — you've been ~18g short.",
    "encouragement": "1.2kg from your first milestone.",
    "generated_at": "2026-04-07T08:14Z"
  }
}
```

**`GET /progress/summary`**
```json
Response: {
  "goal_weight_kg": 75.0,
  "start_weight_kg": 92.0,
  "current_weight_kg": 83.8,
  "total_lost_kg": 8.2,
  "goal_delta_kg": 8.8,
  "goal_pct": 48,
  "trend_slope_14d": -0.6,      // kg/week
  "plateau_detected": false,
  "estimated_weeks_remaining": 14,
  "chart_data": [               // last 30 days by default
    { "date": "2026-03-08", "weight_kg": 90.1, "rolling_avg": 90.4 },
    ...
  ]
}
```

**`GET /gamification/status`**
```json
Response: {
  "streak": {
    "current": 13,
    "longest": 21,
    "last_checkin_date": "2026-04-06",
    "freeze_available": true,
    "freeze_resets_at": "2026-05-01"
  },
  "total_checkins": 47,
  "badges": ["first_checkin", "week_streak", "first_kilo", "10_checkins"],
  "next_milestone": { "type": "30_day_streak", "days_remaining": 17 }
}
```

---

## 10. Retention Metrics

### Metrics to Track

| Metric | Definition | Target | Tracked Via |
|---|---|---|---|
| D7 Retention | % of new users who check in on day 7 | > 45% | `habit_log` + `users.created_at` |
| D30 Retention | % of new users who check in at least once in week 4 | > 25% | `habit_log` |
| DAU (Daily Active Users) | Unique users who submit a check-in on a given day | — (track trend) | `habit_log` aggregation |
| Check-in Completion Rate | % of days in which registered users submit a check-in | > 60% | `habit_log` vs `users` count |
| Streak Length Distribution | % of active users by streak bucket (1–6, 7–13, 14–29, 30+) | — (track toward longer buckets) | `streak_record` |
| Notification Open Rate | % of push/email notifications opened | Push > 20%, Email > 25% | `notification_event.opened_at` |
| AI Feedback Engagement | % of check-ins where user scrolls to/taps AI feedback card | > 70% | Frontend event: `ai_feedback_viewed` |
| Weekly Report Read Rate | % of generated reports opened in-app | > 50% | `ai_report` vs `notification_event.opened_at` |
| Feature Engagement Rate | % of active users using each feature per week | — | Analytics events |
| Streak Recovery Rate | % of broken streaks that resume within 3 days | > 30% | `streak_record` reset + resume analysis |

### Analytics Events to Add

All extend the existing `AnalyticsEventName` union in `lib/analytics.ts`:

```
checkin_started                 User opens check-in card
checkin_submitted               Check-in submitted (properties: mood, adherence, weight_logged: bool)
checkin_skipped                 User dismissed check-in card without submitting
ai_feedback_viewed              AI feedback card scrolled into view
ai_feedback_expanded            User tapped "read more" on feedback
meal_suggestion_requested       "What should I eat today?" tapped
streak_milestone_reached        (properties: streak_length, milestone_type)
badge_earned                    (properties: badge_id)
notification_opened             (properties: type, channel, delay_minutes)
notification_dismissed          (properties: type, channel)
report_viewed                   Weekly/behavioral report opened
plan_adjustment_accepted        User accepted AI plan recalibration
plan_adjustment_dismissed       User dismissed plan recalibration
progress_chart_viewed           /progress page loaded
```

---

## 11. Execution Order

### Phase 1 — Core Habit System (Foundation)
1. Alembic migration: create `habit_log`, `progress_entry`, `streak_record`, `notification_preferences`
2. Implement `POST /habits/checkin` with idempotency + streak update logic
3. Implement `GET /habits/checkin/today`
4. Implement `GET /gamification/status`
5. Build check-in card UI on `/dashboard` (mood emoji selector + adherence toggle + optional weight)
6. Build streak display in nav bar + check-in card header

### Phase 2 — AI Feedback Loop
7. Implement `generate_daily_feedback` async job in ai-services layer
8. Wire job dispatch from `POST /habits/checkin` (fire-and-forget via background task)
9. Implement `GET /habits/feedback/status` polling endpoint (fallback)
10. Implement WebSocket event push for AI feedback arrival (optional, improves UX)
11. Build AI feedback card UI (optimistic skeleton → filled state)
12. Implement `POST /habits/meal-suggestion` with half-day caching
13. Build "What should I eat today?" UI (persistent card on `/dashboard` and `/plan`)

### Phase 3 — Progress Tracking
14. Implement `GET /progress/summary` with trend + plateau calculation
15. Implement `GET /progress/entries` + `POST /progress/entries`
16. Build `/progress` page: weight chart + goal delta card + AI insights section
17. Build goal delta card for `/dashboard`
18. Wire chart to `GET /progress/entries` with time range selector

### Phase 4 — Notification System
19. Alembic migration: create `notification_event`
20. Implement Web Push subscription endpoints (`/notifications/push/subscribe`, `/unsubscribe`)
21. Implement notification preferences UI in `/settings/notifications`
22. Implement daily reminder cron job (08:00 per user timezone)
23. Implement streak-at-risk cron job (20:00 per user timezone)
24. Implement missed check-in email sequence (day 3 trigger)
25. Implement goal proximity nudge trigger (fires on check-in submission when goal_delta ≤ 2kg)
26. Implement in-app notification inbox (`GET /notifications/inbox`, `POST /notifications/inbox/:id/dismiss`)
27. Build notification bell + badge count in nav
28. Build in-app notification inbox panel

### Phase 5 — Gamification
29. Implement badge awarding logic in check-in handler
30. Implement milestone detection (weight milestones triggered in `POST /habits/checkin` when progress_entry is written)
31. Build milestone celebration card on `/dashboard`
32. Build badge gallery in `/settings/profile`
33. Implement streak freeze for Pro+ users (monthly allocation in `streak_record`)
34. Build streak freeze UI indicator in check-in card

### Phase 6 — AI Reporting
35. Alembic migration: create `ai_report`
36. Implement weekly report generation job (Sunday cron)
37. Implement plateau detection + plan recalibration logic in report generator
38. Implement `GET /reports/weekly` + `GET /reports/weekly/:period_key`
39. Implement `POST /reports/accept-adjustment`
40. Build weekly report card on `/dashboard` (compact summary + "Read full report" link)
41. Build `/progress` report section (full report view)
42. Implement behavioral insights generation (monthly cron, Pro+ only)
43. Implement `GET /reports/behavioral`
44. Build behavioral insights tab on `/progress`

---

## 12. Documentation

### Habit Loop Architecture

The retention system is designed as a closed feedback loop, not a collection of isolated features. Each component reinforces the others:

**Trigger:** The daily reminder push notification fires once per day at the user's chosen time. This is a time-based external trigger. As the user builds a streak, the streak counter in the nav bar becomes an internal trigger — the user thinks about it before the notification arrives.

**Action:** The check-in interaction is deliberately minimal — mood (one tap), adherence (one tap), optional weight. The entire flow takes under 60 seconds. High-friction check-ins (e.g., full food diary, 10-question surveys) fail because they require more motivation than users have on most days. This design borrows from behavioral science: make the desired behavior easier than the alternative (skipping).

**Variable Reward:** AI feedback is personalized and changes daily. The variability is important — predictable rewards lose their reinforcing power. Users do not know if today's feedback will mention a new insight or highlight a pattern they haven't seen before. This is the same mechanism that makes email and social media checking compulsive. We use it for a prosocial purpose.

**Investment:** Streaks, badges, and progress history all represent accumulated value that increases with continued use. A user with a 30-day streak has a strong reason not to miss tomorrow — the streak represents 30 days of effort. Progress charts showing a downward weight trend are motivating precisely because the user built them. This is the sunk cost mechanism, used constructively.

### Engagement Strategy

**Daily habits are built by reducing the cost of the habit, not increasing motivation.** The check-in is designed to be the lowest possible friction. Weight entry is optional. Notes are optional. The only required inputs are two single-tap responses.

**AI feedback must be specific and personal, not generic.** "Keep it up!" is not a reward. "Your Tuesday adherence has improved from 40% to 85% over the last month" is. The AI prompt is designed to pull from real user data and produce observations that could only apply to that specific user.

**Notifications must earn their place.** Every push notification is a withdrawal from the user's attention budget. The notification system enforces hard caps (2 per day max) and smart timing (no early morning, no late night). Notification fatigue is the most common cause of app uninstall. The system tracks open rates — if a user's open rate drops below 10% for 2 weeks, push notifications are automatically paused and the user is sent an email with a re-engagement prompt instead.

### Notification Logic

**Daily reminder flow:**

```
06:00 UTC — Cron job queries all users where:
  - notification_preferences.daily_reminder_enabled = true
  - notification_preferences.push_enabled = true
  - No habit_log for today (UTC date)
  - preferred_push_time is within the next hour (bucketed by hour)
→ For each matched user:
  - Compute local time (user_timezone offset)
  - If local time is between 07:00 and 21:00 → queue push notification
  - Insert notification_event row (status = 'pending')
  - Dispatch to push service

Push delivery:
  - Use Web Push API with VAPID authentication
  - Notification payload: { title, body, icon, data: { url: '/dashboard' } }
  - On click: open app at /dashboard, check-in card scrolled into view
```

**Streak-at-risk flow:**

```
20:00 local (user's timezone) — Cron job queries:
  - streak_record.current_streak > 0
  - streak_record.last_checkin_date = yesterday (not today)
  - notification_preferences.streak_alerts_enabled = true
  - Today's daily_reminder notification was either not sent or was opened
    (opened = user saw it but didn't check in → higher intent, worth a second nudge)
→ Queue "Your streak is at risk" push notification
```

**Notification open rate tracking:**

The Web Push `click` event fires a `notification_opened` analytics event. The `notification_event.opened_at` timestamp is set via a server endpoint called when the push click routes the user into the app (`GET /notifications/:id/open` called client-side on app launch from notification).

### Gamification Rules

**Streaks:**
- A streak represents consecutive calendar days with a submitted check-in
- Missing a day resets the streak to 0 (no exceptions for free/pro users)
- Pro+ users have one streak freeze per month (auto-applied on the first missed day of the month)
- The current streak is displayed in the nav bar and on the check-in card
- The longest streak is tracked and displayed in `/settings/profile`

**Badges:**
- Badges are permanent — they cannot be revoked
- Each badge is earned exactly once
- Badges are displayed in `/settings/profile` in a grid, earned badges shown prominently, unearned badges shown as greyed outlines
- Badge earn events fire a push notification and an in-app notification (the one moment where double notification is acceptable — it is celebratory, not naggy)

**Why not points/leaderboards?**
Points-based systems and leaderboards create anxiety and comparison. They work for competitive products (fitness challenges, duolingo) but are counterproductive for health apps where the primary goal is private self-improvement. A user who is 30% of the way to their goal weight should feel encouraged, not behind. Badges and streaks are individual achievements that do not compare users against each other.

### AI Reporting System

**Weekly report generation:**

The report generation job runs every Sunday at 06:00 UTC. For each eligible user (Pro or Pro+):

1. Query `habit_log` for the past 7 days
2. Query `progress_entry` for weight trend
3. Query `streak_record` for current streak and check-in count
4. Assemble prompt context: all raw data + user's goal + tier
5. Call AI Gateway → `anthropic/claude-sonnet-4-6` → structured output (JSON schema)
6. Write to `ai_report` (status: ready)
7. Fire `report_ready` notification (in-app + email)

**Plan adjustment acceptance:**

When the AI recommends a plan adjustment, it is stored in `ai_report.adjustments` as a structured proposal:

```json
{
  "type": "calorie_adjustment",
  "reason": "14-day plateau detected. Current deficit may be creating metabolic adaptation.",
  "proposed_change": {
    "field": "daily_calorie_target",
    "from": 1650,
    "to": 1800,
    "duration_days": 7,
    "note": "2-day refeed period to reset metabolic rate, then return to 1650"
  }
}
```

The user sees this as a card: "Your coach recommends a change — see why." They can accept or dismiss. Acceptance calls `POST /reports/accept-adjustment`, which applies the calorie target change to the user's active plan. Dismissal marks the adjustment as declined — no further prompts for 14 days.

### Data Models Reference

See Section 8 for full SQL definitions. Key constraints to note:

- `habit_log` has a `UNIQUE (user_id, log_date)` constraint — idempotent check-in guaranteed at the database level, not just application level
- `streak_record` is a single row per user, updated atomically on each check-in (no append-only log — streak is computed state)
- `ai_report` has a `UNIQUE (user_id, report_type, period_key)` constraint — prevents duplicate report generation for the same period
- `notification_event` is append-only — never update sent notifications, only add new rows and set `opened_at` / `dismissed_at`

### API Reference

See Section 9 for full endpoint list and request/response shapes.

**Error codes specific to this system:**

| Code | HTTP Status | Meaning |
|---|---|---|
| `CHECKIN_ALREADY_SUBMITTED` | 200 (not 409) | Check-in for today exists — return existing row. This is not an error. |
| `AI_FEEDBACK_PENDING` | 202 | Feedback generation in progress — poll `GET /habits/feedback/status` |
| `USAGE_LIMIT_REACHED` | 429 | Free tier daily meal suggestion limit hit (uses Phase 12 UsageTracker) |
| `REPORT_NOT_READY` | 202 | Report generation in progress |
| `ADJUSTMENT_ALREADY_PROCESSED` | 409 | Plan adjustment already accepted or dismissed |

---

## New File Tree

```
backend/app/
  api/v1/endpoints/
    habits.py           Check-in, meal suggestion, feedback status
    progress.py         Progress summary, entries
    gamification.py     Streak, badges, milestone status
    notifications.py    Push subscription, inbox, preferences
    reports.py          Weekly report, behavioral insights, adjustment acceptance
  models/
    habits.py           HabitLog, ProgressEntry, StreakRecord, NotificationPreferences
    reports.py          AiReport, NotificationEvent
  schemas/
    habits.py
    progress.py
    gamification.py
    notifications.py
    reports.py
  services/
    habit_service.py    Check-in processing, streak update, badge awarding
    streak_service.py   Streak computation logic
    notification_service.py  Push dispatch, email triggers, preference checks
    progress_service.py Trend calculation, plateau detection, goal delta
    report_service.py   Weekly report generation orchestration
  dependencies/
    habits.py           get_today_checkin (used by multiple endpoints)

ai-services/app/
  api/endpoints/
    feedback.py         POST /internal/feedback/daily
  prompts/
    daily_feedback.py   Daily check-in feedback prompt template
    weekly_report.py    Weekly report generation prompt template
    meal_suggestion.py  "What should I eat today?" prompt template
    behavioral_insights.py  Monthly behavioral pattern analysis prompt

backend/alembic/versions/
  xxxx_phase13_habit_tables.py

frontend/app/
  dashboard/
    components/
      checkin-card.tsx          Daily check-in (mood + adherence + weight)
      ai-feedback-card.tsx      AI feedback display (skeleton → content)
      streak-display.tsx        Streak count + flame icon
      goal-delta-card.tsx       Progress toward goal weight
      report-notification-card.tsx  "Your report is ready" card
      plan-adjustment-card.tsx  "Your coach recommends a change" card
  progress/
    page.tsx
    components/
      weight-chart.tsx          Time-series chart (Recharts)
      progress-stats-grid.tsx   Key stats (lost, remaining, pace)
      ai-insights-card.tsx      Weekly AI narrative
      behavioral-patterns-tab.tsx  Monthly pattern insights
  settings/
    notifications/
      page.tsx                  Notification preferences UI
    profile/
      components/
        badge-gallery.tsx       Badge display grid

frontend/components/
  gamification/
    milestone-celebration.tsx   Overlay/toast for milestone achievement
    badge-earned-toast.tsx
  notifications/
    notification-bell.tsx       Nav bell + badge count
    notification-inbox.tsx      Inbox panel

frontend/lib/
  push-notifications.ts         Web Push API subscription helpers
  progress-chart-utils.ts       Rolling average calculation for chart
```

---

## Environment Variables — Phase 13

```bash
# Web Push (VAPID keys — generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...    # Same as VAPID_PUBLIC_KEY, exposed to frontend

# Cron (shared with Phase 12)
CRON_SECRET=...

# AI services (if not already set)
AI_SERVICES_INTERNAL_URL=http://localhost:8001   # internal service URL
```

---

## Key Decisions

1. **Check-in is idempotent at the DB level** (`UNIQUE (user_id, log_date)`). Re-submitting updates the row. This prevents double streak increments and duplicate AI feedback jobs.

2. **AI feedback is async, not blocking.** The check-in response is immediate. AI feedback arrives within 1–3 seconds via polling or WebSocket. This keeps the UX response < 100ms regardless of AI latency.

3. **Weight entry is optional in check-in.** Forcing weight entry causes drop-off. Mood + adherence are the minimum viable signals for AI feedback and streak tracking.

4. **No leaderboards or social comparison.** Gamification is individual-only. Social comparison in health apps increases anxiety and attrition among users who are behind.

5. **Streak freezes are Pro+ only and auto-applied.** Not a manual save — it applies automatically on the first missed day of the month. This makes it feel like a benefit, not a safety net the user has to remember to use.

6. **Plan adjustments require explicit user acceptance.** AI never automatically changes a user's calorie target. It proposes, the user accepts. This preserves user agency and prevents confusing unannounced plan changes.

7. **Notification hard caps (2 push/day, 1 email/day).** Implemented as application-level rules in `notification_service.py`, not just Stripe/push service rate limits. The service checks `notification_event` count before queuing any notification.

8. **Weekly reports are in-app first, email second.** The primary delivery is the in-app card (available to all paid tiers). Email is a notification that the report is ready, not the report itself. This drives app opens, which is better for engagement metrics.

---

## Assumptions

- Web Push notifications require HTTPS in production. Local development with `localhost` works in Chrome/Firefox. Safari requires iOS 16.4+ for web push.
- Chart library (Recharts) is not yet installed. If the project uses a different charting library, adapt the chart component.
- Email delivery infrastructure from Phase 12 (Resend or equivalent) is assumed to be in place before notification emails are sent.
- User timezone is captured during onboarding (browser `Intl` API) and stored in `notification_preferences`. If not yet stored, add a migration-time default of 'UTC' and capture it on next app open.
- The ai-services layer (port 8001) is running and accessible. The `POST /internal/feedback/daily` endpoint will be added to that service.
- Monthly behavioral insights (Pro+ only) require at least 4 weeks of check-in history to generate meaningful patterns. The report generator should check minimum data requirements before calling the AI.

---

## Confidence

| Area | Confidence | Notes |
|---|---|---|
| Habit loop design (check-in + streak) | High | Well-established behavioral pattern |
| AI feedback generation | High | Builds on existing ai-services infrastructure |
| Web Push notifications | Medium | Browser support good; Safari still patchy on older iOS |
| Retention metric improvement (D7/D30) | Medium | Depends on notification open rates + check-in completion |
| Plateau detection algorithm | High | Simple linear regression, deterministic |
| Streak freeze engagement impact | Medium | Requires A/B test to confirm retention lift |
| Weekly report read rate > 50% | Medium | Depends on report quality and delivery timing |
| Behavioral insights quality | Medium | Requires 30+ days of data per user; early users will get thin reports |

---

## Review Checklist

- ✅ Task 13.1.1 — Core habit system: daily check-in, AI feedback, meal suggestion
- ✅ Task 13.1.2 — Progress tracking: weight graph, AI insights, goal tracking
- ✅ Task 13.2.1 — Notification system: push/email, missed alerts, goal proximity nudges
- ✅ Task 13.2.2 — Streak & gamification: streaks, milestones, badges, streak freeze
- ✅ Task 13.3.1 — AI reports: weekly report, plan adjustments, behavioral insights
- ✅ Habit loop clearly defined (trigger → action → variable reward → investment)
- ✅ Daily engagement cycle specified (< 60s check-in, async AI feedback)
- ✅ AI feedback integrated (async job, WebSocket + polling fallback)
- ✅ Notifications optimized (2/day cap, smart timing, open rate tracking)
- ✅ Gamification meaningful (individual, not comparative)
- ✅ Retention metrics defined (D7, D30, DAU, check-in rate, streak distribution)
- ✅ All data models defined (6 tables)
- ✅ All APIs defined (18 endpoints)
- ✅ Execution order specified (6 phases, 44 numbered steps)
- ✅ Documentation complete
- ✅ File saved correctly
