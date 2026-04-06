# User Adoption System — Architecture & Reference

> Features 10.1 (Progressive Onboarding), 10.2 (User Guidance), 10.3 (Feedback & Signals)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                   │
│                                                             │
│  OnboardingForm ─── useOnboardingProgress ──► localStorage  │
│       │                     │                    │          │
│       │               (debounced)                │          │
│       ▼                     ▼                    │          │
│  FieldTooltip          /api/v1/onboarding/state  │          │
│  Walkthrough                                     │          │
│  FeedbackWidget ──────────► /api/v1/feedback     │          │
│  useBehaviorTracker ──────► /api/v1/feedback/signals        │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP (JWT or anonymous)
                              │
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                       │
│                                                             │
│  /onboarding/state  ─► OnboardingService ─► onboarding_states│
│  /feedback          ─► FeedbackService   ─► feedback_entries │
│  /feedback/signals  ─► FeedbackService   ─► behavior_signals │
└─────────────────────────────────────────────────────────────┘
                              │
                         PostgreSQL
                              │
                    (future) AI analysis pipeline
```

### System Boundaries

| System | Responsibility |
|--------|---------------|
| **Onboarding Engine** | Step progression, field validation, partial-progress persistence |
| **Guidance System** | Tooltips, walkthrough overlay, contextual help triggers |
| **Feedback System** | Explicit ratings/text + passive behavior signals → backend → AI |

---

## 2. Component Breakdown

### Frontend

| File | Purpose |
|------|---------|
| `app/onboarding/components/onboarding-form.tsx` | Enhanced 4-step wizard with tooltips, walkthrough, and auto-save |
| `components/guidance/field-tooltip.tsx` | Lightweight inline tooltip (hover/focus) |
| `components/guidance/walkthrough.tsx` | Sequential overlay walkthrough with DOM element highlighting |
| `components/feedback/feedback-widget.tsx` | Floating feedback button — star rating + free text |
| `hooks/use-onboarding-progress.ts` | Persist/restore onboarding state (localStorage + backend) |
| `hooks/use-behavior-tracker.ts` | Passive signal capture (rage clicks, hesitation, abandonment) |
| `lib/api-client.ts` | `fetchOnboardingState`, `saveOnboardingState`, `submitFeedback`, `logBehaviorSignal` |
| `lib/session-id.ts` | Stable per-tab session ID (shared with analytics) |

### Backend

| File | Purpose |
|------|---------|
| `models/onboarding.py` | `OnboardingState` — one row per user |
| `models/feedback.py` | `FeedbackEntry`, `BehaviorSignal` |
| `schemas/onboarding.py` | `OnboardingStateUpdate`, `OnboardingStateResponse` |
| `schemas/feedback.py` | `FeedbackPayload`, `BehaviorSignalPayload` |
| `services/onboarding_service.py` | `get_state()`, `upsert_state()` |
| `services/feedback_service.py` | `create_feedback()`, `log_signal()` |
| `api/v1/endpoints/onboarding.py` | `GET /onboarding/state`, `PUT /onboarding/state` |
| `api/v1/endpoints/feedback.py` | `POST /feedback`, `POST /feedback/signals` |
| `alembic/versions/d9e8f7a6b5c4_add_user_adoption_tables.py` | Migration for all three new tables |

---

## 3. API Contracts

### GET `/api/v1/onboarding/state`

**Auth:** Bearer token required

**Response 200:**
```json
{
  "user_id": 42,
  "current_step": 2,
  "completed": false,
  "form_data": { "name": "Alice", "age": "30" },
  "updated_at": "2026-04-06T14:00:00Z"
}
```

**Response 404:** User has no saved state (start from step 0).

---

### PUT `/api/v1/onboarding/state`

**Auth:** Bearer token required

**Request body:**
```json
{
  "current_step": 2,
  "form_data": { "name": "Alice", "age": "30", "height_cm": "165" },
  "completed": false
}
```

**Response 200:** Same shape as GET response.

---

### POST `/api/v1/feedback`

**Auth:** Optional (anonymous users can submit)

**Request body:**
```json
{
  "session_id": "1712345678-abc1234",
  "feedback_type": "mixed",
  "rating": 4,
  "text": "Loved the onboarding flow!",
  "context": "onboarding/step-4",
  "metadata": {}
}
```

`feedback_type`: `"rating"` | `"text"` | `"mixed"`
`rating`: 1–5 (omit for text-only)

**Response:** 204 No Content

---

### POST `/api/v1/feedback/signals`

**Auth:** Optional

**Request body:**
```json
{
  "session_id": "1712345678-abc1234",
  "signal_type": "rage_click",
  "context": "onboarding/step-2",
  "properties": { "target": "continue-btn", "count": 3 }
}
```

`signal_type`: `rage_click` | `drop_off` | `hesitation` | `repeated_action` | `abandonment`

**Response:** 204 No Content

---

## 4. Data Schema

### `onboarding_states`

| Column | Type | Notes |
|--------|------|-------|
| `id` | int PK | |
| `user_id` | int FK → users | `UNIQUE`, CASCADE delete |
| `current_step` | int | 0-indexed step |
| `completed` | bool | True after successful submit |
| `form_data` | JSONB | Partial form values |
| `updated_at` | timestamptz | Auto-updated |
| `created_at` | timestamptz | |

### `feedback_entries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | int PK | |
| `user_id` | int FK → users | Nullable (anonymous) |
| `session_id` | varchar(100) | |
| `feedback_type` | varchar(50) | rating / text / mixed |
| `rating` | int | 1–5, nullable |
| `text` | text | Nullable |
| `context` | varchar(100) | Page/feature label |
| `metadata` | JSONB | Extra properties |
| `created_at` | timestamptz | |

### `behavior_signals`

| Column | Type | Notes |
|--------|------|-------|
| `id` | int PK | |
| `user_id` | int FK → users | Nullable |
| `session_id` | varchar(100) | |
| `signal_type` | varchar(50) | Indexed |
| `context` | varchar(200) | |
| `properties` | JSONB | Signal-specific data |
| `created_at` | timestamptz | |

---

## 5. Event Tracking Spec

### Automatic signals (via `useBehaviorTracker`)

| Signal | Trigger | Properties |
|--------|---------|------------|
| `rage_click` | 3+ clicks on same element within 600 ms | `target`, `count` |
| `hesitation` | No user interaction for 30 s | `threshold_ms` |
| `abandonment` | `beforeunload` or `visibilitychange → hidden` | `trigger` |

### Manual signals (call `track()`)

| Signal | When to call | Example properties |
|--------|-------------|-------------------|
| `drop_off` | User navigates backward in wizard | `from_step`, `to_step` |
| `repeated_action` | User re-enters same field many times | `field`, `count` |

### Analytics events (existing `trackEvent` in `lib/analytics.ts`)

Onboarding step completions continue to use the existing analytics pipeline. Behavior signals use the new `/feedback/signals` endpoint to keep the schemas separate.

---

## 6. Persistence Strategy

```
User types in field
       │
       ▼
updateField() called
       │
  setForm() + save()     ← immediate
       │
  writeLocal()           ← localStorage (instant, survives crash)
       │
  debounce(800 ms)
       │
  saveOnboardingState()  ← backend (durable, cross-device)
```

On mount:
1. Try `GET /api/v1/onboarding/state` (cross-device resume)
2. Fall back to `localStorage` (same-device resume without auth)

On completion: `localStorage` is cleared; backend `completed = true` is set immediately (no debounce).

---

## 7. Feature Flags Integration

The system respects the existing `feature-flags.ts` pattern. To gate any adoption feature:

```ts
// frontend/lib/feature-flags.ts
export interface FeatureFlags {
  // ... existing ...
  walkthroughEnabled: boolean;
  feedbackWidgetEnabled: boolean;
  behaviorTrackingEnabled: boolean;
}
```

Add env vars `NEXT_PUBLIC_WALKTHROUGH_ENABLED`, `NEXT_PUBLIC_FEEDBACK_WIDGET_ENABLED`, `NEXT_PUBLIC_BEHAVIOR_TRACKING_ENABLED` for gradual rollout or A/B testing.

---

## 8. AI Integration Pipeline

Feedback data is stored structured in PostgreSQL and ready for AI analysis:

```
behavior_signals + feedback_entries
         │
  SQL aggregation query (grouped by context, signal_type, rating)
         │
  POST /orchestrator  (ai-services, existing multi-agent system)
         │
  behavior_agent.py   (existing agent — extend with feedback analysis)
         │
  Insights → UX improvements → adaptive plan adjustments
```

**Recommended extension:** Add a `FeedbackAnalysisAgent` to `ai-services/app/agents/` that:
- Clusters negative ratings by `context` to surface problem pages
- Identifies `rage_click` + `abandonment` co-occurrence patterns
- Feeds summary into `behavior_agent`'s adaptive logic

---

## 9. Deployment Checklist

- [ ] Run `alembic upgrade head` (migration `d9e8f7a6b5c4`)
- [ ] Deploy backend — new endpoints auto-registered via `router.py`
- [ ] Add `<FeedbackWidget context="..." />` to dashboard and key pages
- [ ] Set `NEXT_PUBLIC_WALKTHROUGH_ENABLED=true` when ready to roll out
- [ ] Monitor `behavior_signals` for early drop-off patterns post-launch

---

## 10. Future Extensibility

| Enhancement | Approach |
|-------------|---------|
| Contextual help panel (hesitation trigger) | Subscribe to `hesitation` signals client-side; show `<ContextualHelp />` overlay |
| NPS survey | Extend `FeedbackWidget` with a `type="nps"` prop; same backend endpoint |
| AI-generated onboarding hints | Pass `form_data` + `current_step` to orchestrator; return step-specific advice |
| Cross-device sync | Already supported — `useOnboardingProgress` prefers backend over localStorage |
| Funnel analytics dashboard | Query `onboarding_states` grouped by `current_step` where `completed = false` |
