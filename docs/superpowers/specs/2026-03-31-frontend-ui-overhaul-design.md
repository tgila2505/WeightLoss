# Frontend UI Overhaul Design

**Date:** 2026-03-31
**Scope:** Full-app UI refresh — all screens
**Approach:** Rip & Replace — remove all inline CSS, install Tailwind CSS + shadcn/ui, rebuild every screen

---

## 1. Goals

Transform the WeightLoss app frontend from a functional but visually flat inline-CSS implementation into a polished, production-grade SaaS UI with:

- A consistent design system (Tailwind + shadcn/ui)
- Clean clinical aesthetic: white space dominant, blue/teal accents, medical credibility
- Modern interaction patterns: focus states, loading states, inline validation
- Mobile-first responsive layout across all 8+ screens
- Zero regression in backend contracts or API logic

---

## 2. Constraints

- **Do not modify:** `lib/api-client.ts`, `lib/auth.ts`, `lib/ai-keys.ts`
- **Do not change:** any API types, fetch logic, or localStorage auth patterns
- **Only modify:** JSX return values and style objects in page/component files
- No new runtime dependencies beyond Tailwind + shadcn/ui ecosystem

---

## 3. Dependencies to Install

| Package | Purpose |
|---|---|
| `tailwindcss` | Utility-first CSS framework |
| `postcss` | CSS processing (Tailwind peer dep) |
| `autoprefixer` | Vendor prefix handling (Tailwind peer dep) |
| shadcn/ui CLI + components | Card, Button, Input, Label, Select, Textarea, Badge, Progress, Separator, Avatar, Switch, Checkbox, Accordion |
| `class-variance-authority` | Component variant management (shadcn peer dep) |
| `clsx` + `tailwind-merge` | Class merging utilities (shadcn peer deps) |
| `lucide-react` | Icon library (shadcn default) |

All shadcn peer deps are auto-installed by the shadcn CLI.

---

## 4. New File Structure

```
frontend/
├── tailwind.config.ts          ← NEW: Tailwind config with content paths
├── postcss.config.js           ← NEW: PostCSS config
├── app/
│   ├── globals.css             ← MODIFIED: add Tailwind directives + shadcn CSS vars
│   ├── components/
│   │   ├── ui/                 ← NEW: shadcn auto-generated primitives
│   │   ├── nav-bar.tsx         ← REBUILT with Tailwind
│   │   ├── input-box.tsx       ← REBUILT with Tailwind
│   │   └── page-shell.tsx      ← NEW: shared authenticated page wrapper
│   ├── login/page.tsx          ← REBUILT
│   ├── register/page.tsx       ← REBUILT
│   ├── onboarding/
│   │   └── components/
│   │       └── onboarding-form.tsx  ← REBUILT
│   ├── dashboard/page.tsx      ← REBUILT
│   ├── plan/page.tsx           ← REBUILT
│   ├── tracking/page.tsx       ← REBUILT
│   ├── interaction/page.tsx    ← REBUILT
│   ├── reminders/page.tsx      ← REBUILT
│   └── settings/page.tsx       ← REBUILT
```

---

## 5. Design Tokens

**Color palette (clean clinical):**

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| Primary | `blue-600` | #2563eb | CTAs, active nav, focus rings |
| Primary hover | `blue-700` | #1d4ed8 | Button hover |
| Surface | `white` / `slate-50` | — | Page bg / card bg |
| Border | `slate-200` | #e2e8f0 | All borders |
| Text primary | `slate-900` | #0f172a | Headings, body |
| Text secondary | `slate-500` | #64748b | Subtitles, hints |
| Error | `red-600` | #dc2626 | Validation errors |
| Success | `emerald-600` | #059669 | Success states |
| Accent | `teal-500` | #14b8a6 | Health metric highlights |

**Typography scale (Tailwind defaults):**
- Page title: `text-2xl font-bold text-slate-900`
- Section title: `text-lg font-semibold text-slate-900`
- Body: `text-sm text-slate-700`
- Hint/label: `text-xs text-slate-500`

**Spacing:** 8pt system via Tailwind defaults (`p-2`=8px, `p-4`=16px, `p-6`=24px, `p-8`=32px)

**Border radius:** `rounded-xl` for cards, `rounded-lg` for inputs/buttons

---

## 6. Shared Components

### `PageShell`
Wraps every authenticated page. Accounts for NavBar offset.
```
max-w-5xl mx-auto px-4 py-8
```
Mobile: full-width with `pb-20` for bottom nav clearance.
Desktop: left margin offset for sidebar nav.

### `FormCard`
Card wrapper for forms. Uses shadcn `Card` + `CardHeader` + `CardContent`.
- Padding: `p-6 sm:p-8`
- Max width: specified per screen (see below)
- Centered: `mx-auto`

### `SectionTitle`
Consistent heading pattern:
- `h2` with `text-lg font-semibold text-slate-900`
- Optional subtitle `p` with `text-sm text-slate-500 mt-1`

---

## 7. Screen Specifications

### 7.1 Login (`/login`)
- Layout: `min-h-screen flex items-center justify-center bg-slate-50`
- Uses `FormCard` with `max-w-md w-full`
- Content: app logo/name at top, email + password inputs, "Sign in" button (full-width), link to register
- Validation: email format check, password required; errors shown below respective input

### 7.2 Register (`/register`)
- Layout: same as login
- Uses `FormCard` with `max-w-md w-full`
- Content: email, password, confirm password inputs, "Create account" button, link to login
- Validation: password match check inline; error on mismatch shown below confirm field

### 7.3 Onboarding (`/onboarding`)
- Card: `max-w-lg w-full`, centered
- Step progress: shadcn `Progress` component at top of card, value = (currentStep / 4) * 100
- Step label: "Step 2 of 4 — Goals & Conditions" in `text-xs text-slate-500`

**Step 1 — Profile:**
- Full-width: Name
- 2-col grid (`sm:grid-cols-2`): Age | Gender (Select)
- 2-col grid: Height (cm) | Current Weight (kg)

**Step 2 — Goals & Conditions:**
- 2-col grid: Target Weight (kg) | Timeline (weeks)
- Full-width: Health Conditions (Textarea, optional, with helper text)

**Step 3 — Lifestyle:**
- Full-width: Activity Level (Select)
- 2-col grid: Sleep Hours | Diet Pattern (Select)

**Step 4 — AI Setup:**
- Descriptive helper text: "These keys are optional. The app works without them."
- Groq API Key (Input type=password + show/hide toggle)
- Mistral API Key (Input type=password + show/hide toggle)

**Navigation:**
- Back button (ghost variant) + Continue/Submit button (default variant, full-width on mobile)
- Continue disabled when required fields in current step are empty
- Submit button shows spinner + "Saving…" during API call

### 7.4 Dashboard (`/dashboard`)
- Layout: `grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6`
- Left column: user greeting card, today's adherence (Badge or Progress ring), quick stats (weight, streak)
- Right column: today's plan card (meals + activity list), AI insight card
- All data from existing `fetchTodayPlan()`, `fetchAdherenceSummary()`, `fetchProfile()` calls

### 7.5 Plan (`/plan`)
- Full-width card per plan section (Breakfast, Lunch, Dinner, Activity)
- shadcn `Accordion` for collapsible individual entries
- `Checkbox` for checklist items with strike-through on checked

### 7.6 Tracking (`/tracking`)
- Metric cards row at top: current weight, goal weight, progress %
  - Each: `Card` with large number (`text-3xl font-bold`) + label below
- Weight history: card list below, each entry showing date + weight
- Inline weight entry form: Input + Button side by side at top

### 7.7 Interaction (`/interaction`)
- Layout: `flex flex-col h-[calc(100vh-64px)] lg:h-screen` (64px = mobile bottom nav height)
- Scrollable message history: `flex-1 overflow-y-auto`
- User messages: right-aligned, `bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2`
- AI messages: left-aligned, `bg-slate-100 text-slate-900 rounded-2xl rounded-bl-sm px-4 py-2`
- Fixed bottom input: Textarea + Send button, `border-t border-slate-200 p-4`

### 7.8 Reminders (`/reminders`)
- List of `Card` items per reminder: name + time on left, shadcn `Switch` on right
- "Add reminder" button at bottom of list

### 7.9 Settings (`/settings`)
- Sections separated by shadcn `Separator` with section label above
- Sections: Profile, AI Keys, Account
- API key inputs: type=password with show/hide toggle
- Inline save buttons per section (not one global save)

---

## 8. NavBar

**Mobile (bottom fixed):**
- `fixed bottom-0 inset-x-0 bg-white border-t border-slate-200`
- 6 icon + label items in `flex justify-around` (Dashboard, Plan, Tracking, Interaction, Reminders, Settings)
- Active: `text-blue-600`, inactive: `text-slate-400`

**Desktop (left sidebar):**
- `fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200`
- App logo at top, nav items stacked vertically with icon + label
- Active: `bg-blue-50 text-blue-600 rounded-lg`

---

## 9. Interaction States

Applied consistently across all interactive elements:

| State | Pattern |
|---|---|
| Input focus | `ring-2 ring-blue-600 ring-offset-1` (shadcn default) |
| Input error | `border-red-500` + `text-xs text-red-600 mt-1` below input |
| Button loading | Spinner icon (lucide `Loader2 animate-spin`) + disabled + "Saving…" |
| Button disabled | `opacity-50 cursor-not-allowed` (shadcn default) |
| Form success | Inline `text-sm text-emerald-600` message or green `Badge` |

---

## 10. Validation Strategy

- Keep existing `useState`-based validation logic intact inside each page
- Replace inline style error display with shadcn-compatible pattern:
  - Set `aria-invalid="true"` on errored Input
  - Render `<p className="text-xs text-red-600 mt-1">{errorMessage}</p>` below input
- Required field check fires on: blur AND submit attempt
- No new validation library introduced

---

## 11. Accessibility

- All `Input` components have corresponding `Label` with matching `htmlFor`/`id`
- Error messages linked via `aria-describedby`
- `aria-invalid` set on errored inputs
- Natural tab order throughout — no focus traps
- Color contrast: all foreground/background combinations meet WCAG AA

---

## 12. Responsive Breakpoints

| Breakpoint | Tailwind prefix | Behaviour |
|---|---|---|
| < 640px (mobile) | default | Single column, bottom nav, full-width forms |
| ≥ 640px (sm) | `sm:` | 2-col grids activate in forms |
| ≥ 1024px (lg) | `lg:` | Sidebar nav activates, dashboard 2-col layout |

---

## 13. Out of Scope

- No backend changes of any kind
- No new API endpoints
- No react-hook-form (keep existing useState validation)
- No animations beyond Tailwind transitions (`transition-colors`, `transition-opacity`)
- No dark mode (out of scope for this pass)
- No new pages or routes
