# Phase 15.4 — UGC SEO + Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leverage user-generated content for SEO growth and optimise conversion from UGC traffic to signup.

**Architecture:** Surface `created_at` for Article schema datePublished, add a `/seo/ugc/list` backend endpoint + `/results` hub frontend page to make UGC indexable as a collection, build `utm.ts` for UTM capture/persistence/share URL construction, wire UTM-aware CTAs and a `UgcShareCard` component into the authenticated app.

**Tech Stack:** FastAPI (Python), Next.js 14 App Router (TypeScript), Pydantic v2, SQLAlchemy, PostHog via `captureEvent`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/schemas/seo.py` | Modify | Add `created_at` to `UgcPageResponse`; add `UgcListItem` + `UgcListResponse` |
| `backend/app/services/seo_service.py` | Modify | Add `list_ugc_pages()` returning full UGC list items |
| `backend/app/api/v1/endpoints/seo.py` | Modify | Add `GET /seo/ugc/list` route |
| `backend/tests/test_seo_ugc_list_api.py` | Create | 4 tests for the new list endpoint |
| `frontend/app/results/[slug]/page.tsx` | Modify | Wire `datePublished`, personalised CTA, view_count badge, `ugc_cta_clicked` event |
| `frontend/app/profile/[slug]/page.tsx` | Modify | UTM-aware CTA + `ugc_cta_clicked` event |
| `frontend/app/results/page.tsx` | Create | `/results` hub page — ISR 24h grid of UGC cards |
| `frontend/lib/utm.ts` | Create | `captureUtm()`, `readUtm()`, `buildShareUrl()` |
| `frontend/app/funnel/start/layout.tsx` | Modify | Call `captureUtm()` on funnel entry |
| `frontend/lib/analytics.ts` | Modify | Add `ugc_cta_clicked` to `AnalyticsEventName` |
| `frontend/components/ugc-share-card.tsx` | Create | Authenticated share-your-results card |

---

## Task 1: Surface `created_at` in `UgcPageResponse` + wire `datePublished`

**Files:**
- Modify: `backend/app/schemas/seo.py:41-59`
- Modify: `frontend/app/results/[slug]/page.tsx:8-94`

- [ ] **Step 1.1: Update `UgcPageResponse` schema**

In `backend/app/schemas/seo.py`, add `created_at` field to `UgcPageResponse`:

```python
from datetime import datetime

class UgcPageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str | None = None
    kg_lost: float | None = None
    weeks_taken: int | None = None
    diet_type: str | None = None
    testimonial: str | None = None
    view_count: int = 0
    display_name: str | None = None
    created_at: datetime | None = None   # ← NEW

    @model_validator(mode='after')
    def derive_display_name(self) -> 'UgcPageResponse':
        if self.display_name is None and self.title:
            m = _TITLE_AUTHOR_RE.match(self.title)
            if m:
                self.display_name = m.group(1)
        return self
```

- [ ] **Step 1.2: Wire `datePublished` in `/results/[slug]/page.tsx`**

In `generateMetadata`, pass `publishedAt` to `buildArticleSchema`:

```typescript
const schema = buildArticleSchema({
  title,
  description,
  path: `/results/${slug}`,
  ...(page.display_name ? { author: page.display_name } : {}),
  ...(page.created_at ? { publishedAt: page.created_at } : {}),  // ← NEW
})
```

The `UgcData` interface already has all needed fields. Add `created_at`:

```typescript
interface UgcData {
  slug: string
  title: string | null
  kg_lost: number | null
  weeks_taken: number | null
  diet_type: string | null
  testimonial: string | null
  view_count: number
  display_name: string | null
  created_at: string | null  // ← NEW (ISO string from backend)
}
```

- [ ] **Step 1.3: Commit**

```bash
git add backend/app/schemas/seo.py frontend/app/results/\[slug\]/page.tsx
git commit -m "fix(seo): surface created_at in UgcPageResponse + wire datePublished on Article schema"
```

---

## Task 2: `GET /seo/ugc/list` endpoint

**Files:**
- Modify: `backend/app/schemas/seo.py` — add `UgcListItem`, `UgcListResponse`
- Modify: `backend/app/services/seo_service.py` — add `list_ugc_pages()`
- Modify: `backend/app/api/v1/endpoints/seo.py` — add route
- Modify: `backend/app/api/v1/endpoints/seo.py:11-22` — import new schemas

- [ ] **Step 2.1: Add `UgcListItem` and `UgcListResponse` to schemas**

Append to `backend/app/schemas/seo.py`:

```python
class UgcListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str | None = None
    kg_lost: float | None = None
    weeks_taken: int | None = None
    diet_type: str | None = None
    display_name: str | None = None

    @model_validator(mode='after')
    def derive_display_name(self) -> 'UgcListItem':
        if self.display_name is None and self.title:
            m = _TITLE_AUTHOR_RE.match(self.title)
            if m:
                self.display_name = m.group(1)
        return self


class UgcListResponse(BaseModel):
    pages: list[UgcListItem]
    total: int
```

- [ ] **Step 2.2: Add `list_ugc_pages()` to service**

Append to `backend/app/services/seo_service.py`:

```python
def list_ugc_pages(session: Session, limit: int = 100, offset: int = 0) -> list[UserGeneratedPage]:
    return (
        session.query(UserGeneratedPage)
        .filter_by(is_public=True)
        .order_by(UserGeneratedPage.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
```

- [ ] **Step 2.3: Add route to endpoint**

In `backend/app/api/v1/endpoints/seo.py`, add to the imports block:

```python
from app.schemas.seo import (
    BlogPostResponse,
    BlogSlugListResponse,
    PublicProfileResponse,
    SeoPageListResponse,
    SeoPageResponse,
    UgcListItem,        # ← NEW
    UgcListResponse,    # ← NEW
    UgcPageResponse,
    UgcPreviewResponse,
    UgcShareRequest,
    UgcShareResponse,
    UgcSlugListResponse,
)
```

Add new route after the `list_ugc_slugs` route:

```python
@router.get("/ugc/list", response_model=UgcListResponse)
def list_ugc_pages(
    limit: int = 100,
    offset: int = 0,
    session: Session = Depends(get_db_session),
) -> UgcListResponse:
    pages = seo_service.list_ugc_pages(session, limit=limit, offset=offset)
    items = [UgcListItem.model_validate(p) for p in pages]
    return UgcListResponse(pages=items, total=len(items))
```

- [ ] **Step 2.4: Commit**

```bash
git add backend/app/schemas/seo.py backend/app/services/seo_service.py backend/app/api/v1/endpoints/seo.py
git commit -m "feat(seo): add GET /seo/ugc/list endpoint for UGC hub page"
```

---

## Task 3: `/results` hub page

**Files:**
- Create: `frontend/app/results/page.tsx`

- [ ] **Step 3.1: Create the hub page**

Create `frontend/app/results/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildBreadcrumbSchema } from '@/lib/seo/schema'

export const revalidate = 86400

interface UgcListItem {
  slug: string
  title: string | null
  kg_lost: number | null
  weeks_taken: number | null
  diet_type: string | null
  display_name: string | null
}

interface UgcListResponse {
  pages: UgcListItem[]
  total: number
}

async function fetchUgcList(): Promise<UgcListItem[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  try {
    const res = await fetch(`${base}/seo/ugc/list`, {
      next: { revalidate: 86400, tags: ['ugc-pages'] },
    })
    if (!res.ok) return []
    const data = (await res.json()) as UgcListResponse
    return data.pages
  } catch {
    return []
  }
}

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Real Weight Loss Results | WeightLoss App',
    description:
      'Browse real weight loss stories from our community. See how people lost weight with personalised calorie plans.',
    path: '/results',
  }),
  other: {
    'script:ld+json': JSON.stringify(
      buildBreadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Results', path: '/results' },
      ])
    ),
  },
}

export default async function ResultsHubPage() {
  const pages = await fetchUgcList()

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Real Results</h1>
        <p className="text-slate-500 mb-10">
          Stories from people who lost weight using personalised calorie plans.
        </p>

        {pages.length === 0 ? (
          <p className="text-slate-400 text-sm">No results yet — be the first to share yours.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => {
              const dietLabel = page.diet_type ? page.diet_type.replace(/-/g, ' ') : null
              return (
                <Link
                  key={page.slug}
                  href={`/results/${page.slug}`}
                  className="block rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all p-5 group"
                >
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-2">
                    Real result
                  </p>
                  <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 leading-snug mb-3 line-clamp-2">
                    {page.title ?? 'Weight Loss Success Story'}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {page.kg_lost !== null && (
                      <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 font-medium">
                        {Math.round(page.kg_lost)} kg lost
                      </span>
                    )}
                    {page.weeks_taken !== null && (
                      <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5">
                        {page.weeks_taken} weeks
                      </span>
                    )}
                    {dietLabel && (
                      <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 capitalize">
                        {dietLabel}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <section className="mt-14 bg-slate-900 rounded-2xl px-6 py-10 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Start your own journey</h2>
          <p className="text-slate-400 text-sm mb-6">
            Get a free personalised calorie target built for your body in under 60 seconds.
          </p>
          <Link
            href="/funnel"
            className="inline-block px-8 py-3 rounded-xl font-semibold text-base bg-blue-500 text-white hover:bg-blue-400 transition-colors"
          >
            Get my free plan →
          </Link>
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 3.2: Commit**

```bash
git add frontend/app/results/page.tsx
git commit -m "feat(seo): add /results hub page listing all public UGC stories"
```

---

## Task 4: `utm.ts` + `captureUtm()` in funnel entry

**Files:**
- Create: `frontend/lib/utm.ts`
- Modify: `frontend/app/funnel/start/layout.tsx`

- [ ] **Step 4.1: Create `frontend/lib/utm.ts`**

```typescript
const UTM_STORAGE_KEY = '_utm'

export interface UtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

/** Read UTM params from the current URL and persist to sessionStorage. Call on page load. */
export function captureUtm(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const utm: UtmParams = {}
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const val = params.get(key)
    if (val) utm[key] = val
  }
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm))
  }
}

/** Return previously captured UTM params, or empty object if none. */
export function readUtm(): UtmParams {
  if (typeof window === 'undefined') return {}
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as UtmParams) : {}
  } catch {
    return {}
  }
}

/** Build a share URL for a UGC result page with UTM attribution. */
export function buildShareUrl(slug: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://weightloss.app'
  return `${base}/results/${slug}?utm_source=ugc&utm_medium=share&utm_campaign=${slug}`
}
```

- [ ] **Step 4.2: Call `captureUtm()` in funnel start layout**

Read `frontend/app/funnel/start/layout.tsx` first, then add a `'use client'` wrapper component that fires `captureUtm()`. If the layout is already a server component, add a small client component:

Current `frontend/app/funnel/start/layout.tsx`:

```typescript
export default function FunnelStartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

Replace with:

```typescript
import { UtmCapture } from '@/components/utm-capture'

export default function FunnelStartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UtmCapture />
      {children}
    </>
  )
}
```

- [ ] **Step 4.3: Create `frontend/components/utm-capture.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { captureUtm } from '@/lib/utm'

export function UtmCapture() {
  useEffect(() => {
    captureUtm()
  }, [])
  return null
}
```

- [ ] **Step 4.4: Commit**

```bash
git add frontend/lib/utm.ts frontend/components/utm-capture.tsx frontend/app/funnel/start/layout.tsx
git commit -m "feat(analytics): add UTM capture/persist/share-url helpers + wire into funnel entry"
```

---

## Task 5: UTM-aware CTAs + `ugc_cta_clicked` event

**Files:**
- Modify: `frontend/lib/analytics.ts:5` — add `ugc_cta_clicked`
- Modify: `frontend/app/results/[slug]/page.tsx` — personalised CTA, view_count badge, fire event
- Modify: `frontend/app/profile/[slug]/page.tsx` — UTM CTA, fire event

- [ ] **Step 5.1: Add `ugc_cta_clicked` to `AnalyticsEventName`**

In `frontend/lib/analytics.ts`, add to the union type:

```typescript
export type AnalyticsEventName =
  // ... existing entries ...
  | 'ugc_cta_clicked'  // ← NEW
```

- [ ] **Step 5.2: Update `/results/[slug]/page.tsx` CTA section**

Replace the static CTA section and add view_count badge. The page is a Server Component so the CTA click event fires via a client component. Add a small inline client component at the bottom of the file:

```typescript
// Add at top of file
import { UgcCtaButton } from '@/components/ugc-cta-button'

// Replace the CTA <section> in the JSX:
<section className="bg-slate-900 rounded-2xl px-6 py-10 text-center">
  {page.view_count > 5 && (
    <p className="text-slate-400 text-xs mb-3">
      {page.view_count} people found this inspiring
    </p>
  )}
  <h2 className="text-xl font-bold text-white mb-2">
    {page.diet_type
      ? `Start your ${page.diet_type.replace(/-/g, ' ')} plan`
      : 'Start your own journey'}
  </h2>
  <p className="text-slate-400 text-sm mb-6">
    Get a free personalised calorie target built for your body in under 60 seconds.
  </p>
  <UgcCtaButton
    href="/funnel"
    label={page.diet_type ? `Get my ${page.diet_type.replace(/-/g, ' ')} plan →` : 'Get my free plan →'}
    slug={slug}
  />
</section>
```

- [ ] **Step 5.3: Create `frontend/components/ugc-cta-button.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { trackFunnelEvent } from '@/lib/analytics'
import { readUtm } from '@/lib/utm'

interface Props {
  href: string
  label: string
  slug: string
}

export function UgcCtaButton({ href, label, slug }: Props) {
  function handleClick() {
    const utm = readUtm()
    trackFunnelEvent('ugc_cta_clicked', { slug, ...utm })
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="inline-block px-8 py-3 rounded-xl font-semibold text-base bg-blue-500 text-white hover:bg-blue-400 transition-colors"
    >
      {label}
    </Link>
  )
}
```

- [ ] **Step 5.4: Update `/profile/[slug]/page.tsx` CTA section**

Replace the generic CTA `<Link>` with `<UgcCtaButton>`:

```typescript
import { UgcCtaButton } from '@/components/ugc-cta-button'

// Replace the CTA <section>:
<section className="bg-slate-900 rounded-2xl px-6 py-10 text-center">
  <h2 className="text-xl font-bold text-white mb-2">Start your own journey</h2>
  <p className="text-slate-400 text-sm mb-6">
    Get a free personalised calorie target built for your body in under 60 seconds.
  </p>
  <UgcCtaButton
    href="/funnel"
    label={profile.diet_type ? `Get my ${profile.diet_type.replace(/-/g, ' ')} plan →` : 'Get my free plan →'}
    slug={slug}
  />
</section>
```

- [ ] **Step 5.5: Commit**

```bash
git add frontend/lib/analytics.ts frontend/components/ugc-cta-button.tsx \
  frontend/app/results/\[slug\]/page.tsx frontend/app/profile/\[slug\]/page.tsx
git commit -m "feat(conversion): personalised CTAs + ugc_cta_clicked event on results/profile pages"
```

---

## Task 6: `UgcShareCard` component

**Files:**
- Create: `frontend/components/ugc-share-card.tsx`

This component is placed in authenticated areas (dashboard, progress page). It calls `POST /seo/ugc/share` and shows the share URL.

- [ ] **Step 6.1: Create `frontend/components/ugc-share-card.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { getAccessToken } from '@/lib/auth'
import { buildShareUrl } from '@/lib/utm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

type State = 'idle' | 'loading' | 'shared' | 'error'

export function UgcShareCard() {
  const [state, setState] = useState<State>('idle')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    setState('loading')
    try {
      const token = getAccessToken()
      const res = await fetch(`${API_BASE}/seo/ugc/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ display_name_visible: true }),
      })
      if (!res.ok) throw new Error('Share failed')
      const data = (await res.json()) as { slug: string; url: string; is_public: boolean }
      setShareUrl(buildShareUrl(data.slug))
      setState('shared')
    } catch {
      setState('error')
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Share your results</h3>
      <p className="text-xs text-slate-500 mb-4">
        Inspire others and get a public page for your weight loss journey.
      </p>

      {state === 'idle' && (
        <button
          onClick={handleShare}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          Create my results page
        </button>
      )}

      {state === 'loading' && (
        <button disabled className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-200 text-white cursor-not-allowed">
          Creating...
        </button>
      )}

      {state === 'shared' && shareUrl && (
        <div className="space-y-2">
          <p className="text-xs text-green-600 font-medium">Your page is live!</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <p className="text-xs text-red-600">
          Could not create your page. Make sure you&apos;ve completed onboarding first.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 6.2: Commit**

```bash
git add frontend/components/ugc-share-card.tsx
git commit -m "feat(ugc): add UgcShareCard component for authenticated share flow"
```

---

## Task 7: Backend tests for `/seo/ugc/list`

**Files:**
- Create: `backend/tests/test_seo_ugc_list_api.py`

- [ ] **Step 7.1: Write tests**

```python
import unittest

from tests.support import ApiTestCase
from app.models.seo import UserGeneratedPage


class SeoUgcListApiTest(ApiTestCase):
    def _create_page(self, user, slug: str, diet_type: str | None = None, is_public: bool = True) -> UserGeneratedPage:
        with self.session_factory() as session:
            page = UserGeneratedPage(
                user_id=user.id,
                slug=slug,
                title=f"How User Lost 10kg in 8 Weeks",
                kg_lost=10.0,
                weeks_taken=8,
                diet_type=diet_type,
                is_public=is_public,
            )
            session.add(page)
            session.commit()
            session.refresh(page)
            session.expunge(page)
            return page

    def test_list_returns_only_public_pages(self) -> None:
        user = self.create_user()
        self._create_page(user, slug="public-lost-10kg-in-8-weeks", is_public=True)
        self._create_page(user, slug="private-lost-5kg-in-4-weeks", is_public=False)

        data = self.client.get("/api/v1/seo/ugc/list").json()

        slugs = [p["slug"] for p in data["pages"]]
        self.assertIn("public-lost-10kg-in-8-weeks", slugs)
        self.assertNotIn("private-lost-5kg-in-4-weeks", slugs)

    def test_list_returns_correct_fields(self) -> None:
        user = self.create_user()
        self._create_page(user, slug="alice-lost-10kg-in-8-weeks", diet_type="keto")

        data = self.client.get("/api/v1/seo/ugc/list").json()
        page = next(p for p in data["pages"] if p["slug"] == "alice-lost-10kg-in-8-weeks")

        self.assertEqual(page["slug"], "alice-lost-10kg-in-8-weeks")
        self.assertAlmostEqual(page["kg_lost"], 10.0, places=1)
        self.assertEqual(page["weeks_taken"], 8)
        self.assertEqual(page["diet_type"], "keto")
        self.assertIn("title", page)

    def test_list_empty_state(self) -> None:
        data = self.client.get("/api/v1/seo/ugc/list").json()
        self.assertIsInstance(data["pages"], list)
        self.assertIsInstance(data["total"], int)

    def test_list_respects_limit(self) -> None:
        user = self.create_user()
        for i in range(5):
            self._create_page(user, slug=f"user-lost-{i}kg-in-{i+4}-weeks")

        data = self.client.get("/api/v1/seo/ugc/list?limit=2").json()
        self.assertLessEqual(len(data["pages"]), 2)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 7.2: Run tests**

```bash
cd backend && python -m pytest tests/test_seo_ugc_list_api.py -v
```

Expected: 4 tests PASS

- [ ] **Step 7.3: Commit**

```bash
git add backend/tests/test_seo_ugc_list_api.py
git commit -m "test(seo): add 4 tests for GET /seo/ugc/list endpoint"
```

---

## Self-Review Checklist

- [x] Spec: `datePublished` wired — Task 1 ✓
- [x] Spec: `/seo/ugc/list` endpoint — Task 2 ✓
- [x] Spec: `/results` hub page — Task 3 ✓
- [x] Spec: `utm.ts` with `captureUtm` / `readUtm` / `buildShareUrl` — Task 4 ✓
- [x] Spec: `captureUtm()` called on funnel entry — Task 4.2 ✓
- [x] Spec: `ugc_cta_clicked` event + UTM props — Task 5 ✓
- [x] Spec: Personalised CTA copy by `diet_type` — Task 5.2 ✓
- [x] Spec: `view_count` social proof badge — Task 5.2 ✓
- [x] Spec: `UgcShareCard` with UTM share URL — Task 6 ✓
- [x] Spec: 4 backend tests — Task 7 ✓
- [x] No placeholders — all steps contain actual code
- [x] Type consistency — `UgcListItem` defined in Task 2.1, used in Task 2.3; `UtmParams` defined in Task 4.1, used in Task 5.3
