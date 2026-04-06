# Rollout & Deprecation Playbook

## Progressive Rollout Phases

### Phase 0 — Internal only (0% public)
```env
NEXT_PUBLIC_WIZARD_ENABLED=true
NEXT_PUBLIC_AB_TESTING_ENABLED=false
NEXT_PUBLIC_WIZARD_ROLLOUT_PCT=0
```
**Access:** Use `?ux=wizard` URL override (team members only).
**Goal:** Verify data saves correctly to all tables. Verify analytics events arrive.
**Exit criteria:** Zero JS errors on wizard steps, profile saves successfully, questionnaire node answers appear in DB.

---

### Phase 1 — Controlled (10%)
```env
NEXT_PUBLIC_AB_TESTING_ENABLED=true
NEXT_PUBLIC_WIZARD_ROLLOUT_PCT=10
```
**Duration:** 1 week minimum, at least 50 completions in wizard bucket.
**Monitor:** Step-1 completion rate, JS error rate, save failures.
**Exit criteria:** Error rate < 1%, step-1 completion > 80%.

---

### Phase 2 — Broad (50%)
```env
NEXT_PUBLIC_WIZARD_ROLLOUT_PCT=50
```
**Duration:** 2 weeks minimum, at least 200 completions per variant.
**Collect:** Overall completion rate, time-to-completion (sum of `timeOnStepMs`), preference override rate.
**Exit criteria:** See "Experiment Evaluation Criteria" below.

---

### Phase 3 — Full (100%)
```env
NEXT_PUBLIC_WIZARD_ROLLOUT_PCT=100
```
All new users get wizard. Existing users keep their saved `ux_mode_preference` if set.

---

## Experiment Evaluation Criteria

### Declare Wizard the Winner (all must be true)
1. **Completion rate** (wizard) ≥ (mindmap) + 5 percentage points
2. **Median time to complete** (wizard) ≤ 1.5× (mindmap) median
3. **Preference override back to mindmap** < 15% of wizard-assigned users
4. **Data quality** — both modes produce equivalent `profiles` and `questionnaire_responses` field coverage

### Declare Mindmap the Winner (any one sufficient)
1. Wizard completion rate < mindmap − 5pp after 100+ completions each
2. Wizard JS error rate > 2%
3. > 25% of wizard-assigned users override preference back to mindmap

---

## Safe Decommission: Removing Wizard (if Mindmap wins)

- [ ] Set `NEXT_PUBLIC_WIZARD_ENABLED=false` — all traffic routes to mindmap immediately
- [ ] Verify `/wizard` redirects to `/mindmap` for all users (mode guard fires)
- [ ] Delete `frontend/app/wizard/` (entire directory)
- [ ] Delete `frontend/app/mindmap/components/mindmap-mode-guard.tsx`
- [ ] Revert `frontend/app/mindmap/page.tsx` to plain `<GraphView />` (no guard wrapper)
- [ ] Delete `frontend/lib/ab-testing.ts`, `frontend/lib/ux-mode.ts`, `frontend/lib/feature-flags.ts`
- [ ] Delete `frontend/components/ux-mode-switcher.tsx`
- [ ] Remove env vars from all environments (Vercel dashboard + `.env.local`)
- [ ] Keep analytics endpoint and `analytics_events` table — data is historical

---

## Safe Decommission: Removing Mind Map (if Wizard wins)

- [ ] Set `NEXT_PUBLIC_MINDMAP_ENABLED=false` — all traffic routes to wizard
- [ ] Verify `/mindmap` redirects to `/wizard` (via `MindMapModeGuard`)
- [ ] Delete `frontend/app/mindmap/` (entire directory)
- [ ] Update any navbar/sidebar links pointing to `/mindmap` → `/wizard`
- [ ] Simplify `frontend/lib/ux-mode.ts` — remove mindmap branches (or delete entire file and inline the single mode)
- [ ] Delete `frontend/components/ux-mode-switcher.tsx` (no alternative to switch to)
- [ ] Keep: `questionnaire_responses` table — existing answers remain valid
- [ ] Keep: `profiles` table — unchanged

---

## Regression Test Checklist (after any decommission)

Run these manually or as an E2E test suite:

- [ ] Profile create (new user) completes without error
- [ ] Profile update (existing user) saves correctly
- [ ] `GET /api/v1/profile` returns correct data
- [ ] `GET /api/v1/questionnaire` returns previous questionnaire answers
- [ ] Dashboard loads with existing profile data (name, metrics displayed)
- [ ] AI plan generation completes successfully (uses profile + questionnaire data)
- [ ] No 404 on any navigable route (navbar, direct URL)
- [ ] Analytics endpoint still accepts events (historical logging works)
- [ ] No localStorage key conflicts (wizard `wizard_progress`, mindmap `mindmap_graph_state`)

---

## Edge Cases

### User switches UX mid-progress
- Wizard progress is in `localStorage['wizard_progress']`. Switching to mindmap and back resumes wizard from last step.
- Mindmap state uses `mindmap_graph_state` key. Both coexist — no conflict.
- All saved node answers are in `questionnaire_responses` (server-side), visible in both UX modes.

### Partial data
- Both UX modes support partial saves — `ProfileUpdate` schema is all-optional.
- A user who completed 2 wizard steps has equivalent state to one who answered 2 mindmap nodes.

### Feature flag misconfiguration
- Both `WIZARD_ENABLED=false` AND `MINDMAP_ENABLED=false` → resolver returns `mindmap` as safe fallback. User is never stranded.

### Analytics failures
- `trackEvent()` is fire-and-forget. Any network/5xx error is silently caught (logged in dev only). The profile save flow is completely independent.

### Existing users seeing wizard for the first time
- No `ux_mode_preference` → evaluated via A/B assignment.
- Their existing questionnaire answers are preserved (same API endpoints, same node IDs).
- Wizard resume state (`wizard_progress`) will be empty — they start from step 1. Existing data from mindmap won't pre-populate wizard fields (acceptable; they can re-confirm their data).
