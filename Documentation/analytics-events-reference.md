# Analytics Events Reference

## Base Envelope

All events share this structure (stored in `analytics_events` table):

```json
{
  "event": "string",
  "userId": "number | null",
  "sessionId": "string (browser session)",
  "uxMode": "wizard | mindmap",
  "timestamp": "ISO 8601",
  "properties": { "...event-specific..." }
}
```

## Event Catalog

### `profile_questionnaire_started`
Fired once per session when a user lands on `/wizard` or `/mindmap` for the first time.

| Property | Type | Description |
|----------|------|-------------|
| `source` | string | Resolution source: `flag`, `override`, `preference`, `ab_test`, `default` |

---

### `wizard_step_completed`
Fired when a wizard step passes validation and data is saved.

| Property | Type | Description |
|----------|------|-------------|
| `stepId` | string | `personal-info`, `goals`, `medical-history`, `lifestyle`, `diet`, `family-history` |
| `stepIndex` | number | 0-based position |
| `timeOnStepMs` | number | Milliseconds spent on this step since last step |

---

### `wizard_step_dropped`
Fired when a user skips an optional step.

| Property | Type | Description |
|----------|------|-------------|
| `stepId` | string | The step that was skipped |
| `reason` | string | Always `skipped` |

---

### `wizard_completed`
Fired when all wizard steps are done and profile is fully saved.

| Property | Type | Description |
|----------|------|-------------|
| `totalSteps` | number | Number of steps completed (not skipped) |

---

### `profile_questionnaire_completed`
Fired when any UX mode completes the full profile. Use for cross-mode completion rate comparison.

*(No extra properties beyond the base envelope.)*

---

### `ux_mode_preference_set`
Fired when a user explicitly switches UX mode via `UXModeSwitcher`.

| Property | Type | Description |
|----------|------|-------------|
| `newMode` | string | `wizard` or `mindmap` |

---

### `ux_mode_resolved`
Reserved for future use — to track mode resolution on each page load.

---

## Naming Conventions

- Snake_case event names
- Pattern: `{subject}_{verb}` or `{subject}_{noun}_{verb}`
- `profile_questionnaire_*` — cross-mode events (comparable between wizard and mindmap)
- `wizard_*` — wizard-specific events

## Decision Metrics SQL

```sql
-- Completion rate by UX mode
SELECT
  ux_mode,
  COUNT(*) FILTER (WHERE event = 'profile_questionnaire_completed') AS completions,
  COUNT(*) FILTER (WHERE event = 'profile_questionnaire_started') AS starts,
  ROUND(
    100.0
    * COUNT(*) FILTER (WHERE event = 'profile_questionnaire_completed')
    / NULLIF(COUNT(*) FILTER (WHERE event = 'profile_questionnaire_started'), 0),
    1
  ) AS completion_rate_pct
FROM analytics_events
WHERE event IN ('profile_questionnaire_started', 'profile_questionnaire_completed')
GROUP BY ux_mode;

-- Wizard step drop-off funnel
SELECT
  (properties->>'stepId') AS step_id,
  (properties->>'stepIndex')::int AS step_index,
  COUNT(*) AS completions
FROM analytics_events
WHERE event = 'wizard_step_completed'
GROUP BY step_id, step_index
ORDER BY step_index;

-- Average time per wizard step
SELECT
  (properties->>'stepId') AS step_id,
  ROUND(AVG((properties->>'timeOnStepMs')::int) / 1000.0, 1) AS avg_seconds
FROM analytics_events
WHERE event = 'wizard_step_completed'
GROUP BY step_id;

-- User preference override rate (wizard users who switched back to mindmap)
SELECT
  COUNT(*) FILTER (WHERE properties->>'newMode' = 'mindmap') AS switched_back,
  COUNT(*) AS total_preference_sets,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE properties->>'newMode' = 'mindmap')
    / NULLIF(COUNT(*), 0),
    1
  ) AS pct_switched_back
FROM analytics_events
WHERE event = 'ux_mode_preference_set'
  AND ux_mode = 'wizard';
```
