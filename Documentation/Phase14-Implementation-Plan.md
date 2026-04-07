# Phase 14 — SEO & Organic Growth Engine
## Implementation Plan

**Date:** 2026-04-07
**Status:** Ready for Implementation
**Scope:** Tasks 14.1 → 14.3 — Programmatic SEO, blog/content engine, UGC SEO, metadata, internal linking, indexing optimization
**Depends on:** Phase 11 (user accounts, funnel, `/funnel/*` routes), Phase 12 (subscription tiers), Phase 13 (habit logs, progress data)

---

## 1. SEO Architecture

### Overview

The SEO system is built around three compounding content flywheels. Each flywheel generates pages independently, and internal linking connects them into a single discoverable graph.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    PROGRAMMATIC SEO ENGINE (pSEO)                    │
│  Template-driven pages for every combination of:                     │
│  goal × diet-type × condition × city                                 │
│  e.g. /plan/lose-weight-keto-london  (1,000s of pages at launch)    │
│  Rendered via Next.js ISR (revalidate: 7 days)                       │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ internal links
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        BLOG / CONTENT ENGINE                         │
│  Markdown-based, weekly publishing cadence                           │
│  Case studies, data insights, educational content                    │
│  Rendered via Next.js SSG (static, revalidate: 24h for fresh posts) │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ internal links
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      USER-GENERATED SEO ENGINE                       │
│  Opt-in public result pages for users who share their progress       │
│  e.g. /results/sarah-lost-12kg-in-10-weeks                          │
│  Rendered via Next.js SSR + on-demand ISR revalidation               │
└──────────────────────────────────────────────────────────────────────┘

                           ↕ connected by
┌──────────────────────────────────────────────────────────────────────┐
│                    METADATA OPTIMIZATION LAYER                       │
│  Dynamic title/description/OG/schema.org for every page type        │
│  Managed in lib/seo/ — not scattered across components               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                       INDEXING CONTROL LAYER                         │
│  app/sitemap.ts (dynamic), app/robots.ts, canonical URLs,           │
│  crawl budget management, page performance targets                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Rendering Strategy Per Page Type

| Page Type | Rendering | Revalidation | Rationale |
|---|---|---|---|
| pSEO template pages (`/plan/[slug]`) | ISR | 7 days | Content rarely changes; ISR avoids SSR cost at scale |
| Blog posts (`/blog/[slug]`) | SSG + on-demand revalidation | On publish | Static = fastest; revalidate on new publish via CMS webhook |
| Blog index (`/blog`) | ISR | 24h | Refreshes when new posts are published |
| UGC result pages (`/results/[slug]`) | ISR | 24h | User progress updates daily; stale-for-24h is acceptable |
| Landing page (`/funnel`) | SSG | On deploy | Marketing copy changes infrequently |
| Pricing page (`/pricing`) | ISR | 1h | Tier changes are infrequent but time-sensitive |
| Sitemap (`/sitemap.xml`) | Dynamic server | Per request (cached 24h) | Must always include new pages |

---

## 2. Programmatic SEO (pSEO) System

### Strategy

pSEO generates hundreds to thousands of landing pages by combining targeting dimensions. Each page is unique enough to avoid duplicate content penalties, useful enough to rank, and minimal enough to generate at scale.

**Targeting dimensions:**

| Dimension | Example Values | Source |
|---|---|---|
| Goal | lose-weight, maintain-weight, build-muscle | Static list (8 values) |
| Diet type | keto, mediterranean, vegan, calorie-counting, intermittent-fasting | Static list (12 values) |
| Health condition | pcos, diabetes, menopause, thyroid, no-condition | Static list (6 values) |
| Gender | women, men | Static list (2 values) |
| Age bracket | 20s, 30s, 40s, 50s-plus | Static list (4 values) |

**Page combinations generated:**
- Simple (goal): `8` pages
- Goal + diet: `8 × 12 = 96` pages
- Goal + diet + condition: `8 × 12 × 6 = 576` pages
- Goal + gender + age: `8 × 2 × 4 = 64` pages
- **Total at launch: ~740 unique pSEO pages** — manageable for indexing, enough to capture long-tail volume

**Do not** generate all permutations of all dimensions simultaneously. This creates thin content at scale and triggers Google's quality filters. Build incrementally: launch goal-only pages first, add diet dimension after 60 days of indexing data.

### URL Structure

```
/plan/[slug]

Slug format: {goal}-{diet}-{condition}-{gender}-{age}
                    ↑       ↑           ↑        ↑
                  optional  optional  optional  optional

Examples:
/plan/lose-weight-keto
/plan/lose-weight-keto-pcos
/plan/lose-weight-keto-pcos-women-30s
/plan/build-muscle-women-40s
/plan/intermittent-fasting
```

Slug is derived from the combination of active dimensions. Not user-specific — these are category pages, not profile pages. Single canonical URL per unique combination. No query parameters in SEO URLs.

### Template Content Per Page

Each pSEO page must be meaningfully unique — not just a title swap. Content is parameterized by the slug dimensions:

```
H1:   "Keto Meal Plan for Women with PCOS to Lose Weight"

Above fold:
- Personalized calorie calculation widget (interactive, pulls user inputs → shows result)
- "Get your exact PCOS-optimized keto plan" CTA → /funnel?preset=keto-pcos

Content sections (server-rendered, not AI-generated per page):
1. "What is a PCOS-optimized keto plan?" — 200-word explainer (parameterized template)
2. Key macro targets for this combination (static data + formula)
3. "7 foods to prioritize" — dimension-specific food list
4. "3 common mistakes" — dimension-specific list
5. Success story quote (pulled from UGC result pages with matching dimensions, if available)
6. FAQ block — 4–5 Q&As, schema.org FAQ markup
7. Related plans (internal links to adjacent combinations)
8. "Get your personalized version" CTA → /funnel

Content is NOT AI-generated at page-render time. Content blocks are pre-written template strings parameterized by dimension. This ensures consistent quality, no AI cost per page view, and deterministic output.
```

### `generateStaticParams` Implementation Pattern

```
// app/plan/[slug]/page.tsx
// generateStaticParams returns all slug combinations for ISR pre-generation
// New combinations added after launch are generated on first request + cached
```

Slugs are computed from `lib/seo/pSEO-combinations.ts` — a static config file listing all valid dimension values and their human-readable labels. This file is the single source of truth for what pages exist.

### Page Templates

Three templates cover all combinations:

| Template | Used For | Key Difference |
|---|---|---|
| `GoalTemplate` | Single-dimension (goal only) | Broader content, higher funnel |
| `GoalDietTemplate` | Goal + diet | More specific food lists and protocols |
| `GoalDietConditionTemplate` | Goal + diet + condition | Medical-sensitive, links to consult disclaimer |

Template selection is determined by the slug parser: count the number of dimensions present → select template.

---

## 3. Metadata Optimization

### Dynamic Metadata Strategy

All metadata is generated in `generateMetadata()` in each route's `page.tsx`. No hardcoded meta tags in layout.tsx except site-wide defaults.

**Title formulas:**

| Page Type | Title Formula |
|---|---|
| pSEO page | `{Goal} {Diet} Plan {Condition} {Gender} {Age} \| AI Metabolic Coach` |
| Blog post | `{Post Title} \| AI Metabolic Coach` |
| UGC result page | `How {Name} Lost {X}kg in {N} Weeks \| AI Metabolic Coach` |
| Landing page | `AI Metabolic Coach — Your Personalized Weight Loss Plan` |
| Pricing | `Plans & Pricing \| AI Metabolic Coach` |

**Description formula:**
- Max 155 characters
- Includes primary keyword in first 100 characters
- Ends with action statement

Example (pSEO page): *"A keto meal plan designed for women with PCOS. Get your exact calorie target, macro split, and 7-day schedule — personalized to your body in 3 questions."*

### Open Graph Tags

Every page that can be shared on social sets:

```html
<meta property="og:title" content="{dynamic}" />
<meta property="og:description" content="{dynamic, ≤ 200 chars}" />
<meta property="og:image" content="{dynamic OG image URL}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="{canonical URL}" />
<meta name="twitter:card" content="summary_large_image" />
```

**Dynamic OG images:** Generated using Next.js `@vercel/og` (ImageResponse) at `/api/og/[type]/[slug]`. Templates by page type:

- **pSEO page:** Dark background, large goal headline, macro preview numbers, brand logo
- **Blog post:** Article title, author name, estimated read time, branded gradient
- **UGC result page:** Achievement stats (kg lost, weeks, percentage to goal), user first name only

OG images are edge-cached via Next.js Route Handler caching. Not generated per user visit.

### Structured Data (schema.org)

Injected as JSON-LD `<script>` in `<head>` per page type:

| Page Type | Schema Types |
|---|---|
| pSEO pages | `WebPage`, `FAQPage` (for FAQ block), `BreadcrumbList` |
| Blog posts | `Article`, `BreadcrumbList`, `Person` (author) |
| UGC result pages | `Article`, `BreadcrumbList` |
| Homepage/Landing | `WebSite`, `Organization`, `SiteLinksSearchBox` |
| Pricing | `WebPage`, `Offer` (each pricing tier) |

Structured data is generated in `lib/seo/schema.ts` — one function per schema type, composed in `generateMetadata()`. Never hardcoded inline in JSX.

### Canonical URLs

All pages set a `<link rel="canonical">` pointing to the definitive URL for that content. Rules:

1. pSEO pages: canonical = the slug URL itself. Never index pages accessed via query parameters.
2. Blog posts: canonical = `/blog/[slug]`. Prevent indexing of tag/category views.
3. UGC pages: canonical = `/results/[slug]`. The sharing URL is the canonical URL.
4. Paginated blog index: `page 1` = `/blog`, `page 2+` = `/blog?page=2` with `rel="prev"/"next"` links.
5. Funnel pages (`/funnel/*`): `<meta name="robots" content="noindex">`. The funnel is an acquisition tool, not a content asset.
6. App pages (`/dashboard`, `/settings`, etc.): `<meta name="robots" content="noindex, nofollow">`.

---

## 4. Internal Linking Strategy

### Linking Graph

Internal links are the primary lever for distributing page authority and improving crawl efficiency. The linking graph has four layers:

```
/blog/* ──────────────────────────── links to relevant pSEO pages
   │                                  ("See our keto meal plan for women →")
   │
/plan/* (pSEO) ───────────────────── links to related pSEO pages
   │         └──────────────────────── links to relevant blog posts
   │
/results/* (UGC) ─────────────────── links to relevant pSEO plan page
   │         └──────────────────────── links to funnel with preset params
   │
/funnel (landing) ────────────────── links to /plan/* (featured plans)
                  └──────────────────── links to /blog (featured posts)
```

### Linking Rules

1. **Contextual anchors only.** No "click here" or "read more" anchors. Use keyword-rich descriptive text: "keto meal plan for PCOS" not "our plan."

2. **Each pSEO page links to 3–5 related plans** (adjacent dimensions). Related plans are computed from the slug: if the page is `lose-weight-keto-pcos`, related plans are `lose-weight-keto`, `lose-weight-pcos`, `lose-weight-mediterranean-pcos`. Generated programmatically in `lib/seo/related-pages.ts`.

3. **Each blog post links to 1–2 pSEO pages** within the post body (not in a sidebar). Example: a post titled "7 Signs Your Calorie Deficit Is Too Aggressive" links to `/plan/lose-weight-calorie-counting` in the body where relevant.

4. **UGC result pages link to the pSEO page matching the user's goal + diet protocol.** Sarah's result page (keto, PCOS, lose weight) links to `/plan/lose-weight-keto-pcos`. This is the single most valuable UGC → pSEO link because it has natural context ("Sarah used this plan").

5. **Landing page features 3 pSEO pages** as "popular plans" — rotated monthly based on which pSEO pages have the highest organic traffic.

6. **No orphan pages.** Every pSEO page must be linked from at least one blog post or another pSEO page. Orphan pages waste crawl budget. The sitemap alone is not enough.

### Breadcrumbs

Breadcrumbs are implemented in every content page and rendered as both visual nav and schema.org `BreadcrumbList`:

```
Home > Plans > Keto Plans > Keto for Women with PCOS to Lose Weight
Home > Blog > Nutrition > 7 Signs Your Calorie Deficit Is Too Aggressive
Home > Results > How Sarah Lost 12kg in 10 Weeks
```

Breadcrumb links are crawlable anchor tags — not JavaScript-rendered.

---

## 5. Blog & Content Engine

### Architecture

Blog content is stored as **MDX files** in `content/blog/` (git-tracked). No external CMS dependency for MVP. MDX allows React components inside markdown — needed for interactive calorie calculators embedded in posts.

File naming: `content/blog/YYYY-MM-DD-{slug}.mdx`

Frontmatter per post:

```yaml
---
title: "7 Signs Your Calorie Deficit Is Too Aggressive"
description: "If you're eating less but not losing weight, the problem might be eating too little. Here's how to tell."
publishedAt: "2026-04-07"
updatedAt: "2026-04-07"
author: "AI Metabolic Coach Team"
category: "nutrition"
tags: ["calorie-deficit", "metabolism", "weight-loss-plateau"]
keywords: ["calorie deficit too low", "not losing weight eating less", "metabolic adaptation"]
featuredImage: "/blog/calorie-deficit-signs.jpg"
status: "published"   # draft | published
relatedPlanSlugs: ["lose-weight-calorie-counting", "lose-weight-intermittent-fasting"]
---
```

### Content Types & Cadence

| Content Type | Description | Cadence | Target Keyword Intent |
|---|---|---|---|
| **Case study** | "How [Name] Lost [X]kg in [N] Weeks Using a [Method] Plan" | 2×/month | Informational + social proof |
| **Data insight** | Aggregate anonymized data: "What 10,000 users taught us about weight loss plateaus" | 1×/month | Informational, high shareability |
| **Educational** | Deep-dive on a mechanism: "Why your TDEE decreases as you lose weight" | 1×/week | Informational, long-tail |
| **Keyword guide** | "Complete Guide to [X]" format targeting head terms | 1×/month | Mixed intent, pillar content |
| **Tool/calculator** | Interactive: "Calculate Your Ideal Protein Intake" | 1×/month | High-intent, link-worthy |

Minimum publishing cadence: **4 posts/month**. Quality > quantity — thin posts harm domain authority.

### CMS Path (Future)

MDX + git works for a small team. When content team scales beyond 3 writers, migrate to a headless CMS (Sanity or Contentful) with webhook-triggered on-demand revalidation. The blog rendering layer is CMS-agnostic: `getBlogPost(slug)` and `getAllBlogPosts()` functions in `lib/content/blog.ts` abstract the data source. Switching from MDX to Sanity requires only updating those two functions.

### Blog Page Structure

`/blog` — index page:
- Hero: featured post (most recent or hand-picked)
- Category filter tabs (All / Nutrition / Progress / Mindset / Recipes)
- Post grid (12 per page, pagination)
- Sidebar: popular posts + newsletter signup

`/blog/[slug]` — individual post:
- Article content (MDX rendered)
- Author byline + publish date + estimated read time
- Table of contents (auto-generated from H2/H3 headings)
- In-content CTA: contextual upgrade prompt ("Want a personalized version of this plan?")
- Related posts (3, determined by matching tags)
- Related pSEO plans (1–2, from `relatedPlanSlugs` frontmatter)
- Comments: disabled (reduces spam, reduces moderation burden)

---

## 6. Keyword Strategy

### Keyword Tiers

| Tier | Monthly Search Volume | Competition | Examples |
|---|---|---|---|
| Head terms (brand awareness) | 10k–100k | High | "weight loss meal plan", "keto diet plan" |
| Mid-tail (category) | 1k–10k | Medium | "keto meal plan for women", "meal plan for PCOS" |
| Long-tail (specific intent) | 100–1k | Low | "keto meal plan for PCOS to lose weight fast" |
| Intent-match (conversion) | 100–1k | Low | "personalized weight loss plan free", "AI meal plan generator" |

**Phase 14 strategy:** Focus exclusively on long-tail and intent-match keywords. Head terms require domain authority we don't yet have. Long-tail keywords drive qualified traffic (users with specific needs who convert better) and are achievable within 90 days.

### Keyword → Page Mapping

| Keyword Example | Target Page Type | Intent |
|---|---|---|
| "keto meal plan for women with PCOS" | `/plan/lose-weight-keto-pcos-women` | Informational → acquisition |
| "how to lose weight with hypothyroidism" | Blog educational post | Informational |
| "AI meal plan generator free" | `/funnel` (landing page) | High-intent acquisition |
| "Sarah lost 12kg using AI meal plan" | `/results/[slug]` (UGC) | Informational → social proof |
| "weight loss plateau keto" | Blog data insight | Informational |
| "personalized weight loss plan" | `/funnel` | High-intent acquisition |
| "calorie deficit calculator" | Blog tool/calculator post | High-intent, link-worthy |

Keyword assignments are stored in `keyword_mapping` table for tracking coverage and ranking over time (see Section 9).

### Content Gap Analysis

Quarterly process: query Google Search Console (or SEMrush) for:
1. Queries where the site appears in positions 11–30 (near-page-1 opportunities)
2. Queries with impressions but 0 clicks (title/description needs work)
3. Queries not currently targeted by any page (content gaps → new pSEO pages or blog posts)

Results feed directly into the pSEO combination config and editorial calendar.

---

## 7. User-Generated SEO (UGC) System

### Opt-In Public Result Pages

UGC SEO requires user consent. Users who share their progress generate indexed pages. This is opt-in only — never auto-publish.

**User flow:**
1. User reaches a progress milestone (e.g., 5kg lost, 30-day streak, goal reached) — Phase 13 milestone event
2. In-app notification: "You've lost 5kg. Want to share your story? It could help others." + "Share my results" button
3. User clicks → `/settings/share` → sees preview of their public result page
4. User toggles "Make my results public" (default: off)
5. Optional: add a quote, allow/disallow first name display (default: allow first name, hide surname)
6. `user_generated_page` row created, `slug` generated (see below), page is submitted to Google Search Console indexing API

**Opt-out:** User can un-publish at any time from `/settings/share`. Page is de-indexed via `<meta name="robots" content="noindex">` on the next render, and removed from sitemap. Full delete removes the `user_generated_page` row.

### URL Generation

```
/results/{first-name-slug}-lost-{kg}kg-in-{weeks}-weeks

Examples:
/results/sarah-lost-12kg-in-10-weeks
/results/james-lost-8kg-in-7-weeks
/results/anna-lost-21kg-in-18-weeks

Slug components:
- first-name-slug: user.first_name.toLowerCase().replace(/[^a-z]/g, '') (first name only)
- kg: Math.round(total_kg_lost) (rounded to nearest whole number)
- weeks: Math.round(weeks_since_start) (rounded)

Collision handling: if slug already exists, append "-2", "-3" etc.
Minimum requirements for a shareable page:
  - At least 10 check-ins logged
  - At least 1.0 kg lost (prevents gaming with fake data)
  - Account age >= 14 days
```

### UGC Page Content

Content is generated from the user's anonymized data and stored in `user_generated_page.content` at publish time (not rendered dynamically from live user data — snapshot at publish):

```
H1:   "How Sarah Lost 12kg in 10 Weeks with an AI Metabolic Plan"

Stats block:
- Starting weight: [hidden — only delta shown]
- Total lost: 12.3kg
- Duration: 10 weeks
- Average weekly loss: 1.2kg
- Adherence rate: 84%
- Streak: 68 days

User quote (if provided): "I've tried everything. Having a plan that adjusted to my actual biometrics made all the difference."

What worked (parameterized from user's goal/protocol):
- 3 habit patterns from their check-in history (anonymized AI summary)
- Protocol used (keto / Mediterranean / etc.)

CTA:
"Get a plan built for your biology — like Sarah's"
→ /funnel?ref=results-sarah

Related plan:
→ /plan/lose-weight-keto (if Sarah used keto)
```

### Backlink Generation

UGC result pages generate natural backlinks when:
1. Users share the URL on social media, Reddit weight loss communities, forums
2. The page appears in search results for "[name] weight loss" or "lost [X]kg in [N] weeks" queries
3. Other blogs/journalists find and cite aggregate result data

The sharing CTA on result pages is shareable via:
- Native share button (Web Share API, falls back to copy-link)
- Pre-written social copy: *"I lost 12kg in 10 weeks with an AI meal plan. Here's how: [URL]"*
- OG image optimized for Twitter/Instagram card format (shows stats prominently)

---

## 8. Indexing Optimization

### Sitemap Generation

Dynamic sitemap at `app/sitemap.ts` (Next.js App Router). Returns a `MetadataRoute.Sitemap` array. Updated on each request (cached with a 24-hour TTL via Next.js route caching).

**Sitemap sections:**

| Section | Pages Included | Priority | Change Freq |
|---|---|---|---|
| Static pages | `/`, `/pricing`, `/blog`, `/funnel` | 1.0 | Monthly |
| pSEO pages | All `/plan/[slug]` combinations | 0.8 | Weekly |
| Blog posts | All `status = 'published'` posts | 0.7 | Weekly (for recent), monthly (for older) |
| UGC result pages | All `user_generated_page.public = true` | 0.6 | Monthly |

**Excluded from sitemap:**
- `/funnel/*` (all funnel sub-routes — acquisition only, not content)
- `/dashboard`, `/settings`, `/api/*` (app routes — noindex)
- Draft blog posts
- User profile pages (private by default)

**Sitemap splitting:** When the total pages exceed 50,000 (Google's per-sitemap limit), split into:
- `/sitemap.xml` — index sitemap pointing to:
  - `/sitemap/static.xml`
  - `/sitemap/plans.xml`
  - `/sitemap/blog.xml`
  - `/sitemap/results.xml`

### robots.txt

`app/robots.ts` (Next.js App Router):

```
User-agent: *
Allow: /
Allow: /plan/
Allow: /blog/
Allow: /results/
Disallow: /dashboard
Disallow: /settings
Disallow: /funnel/start
Disallow: /funnel/preview
Disallow: /funnel/upgrade
Disallow: /funnel/welcome
Disallow: /api/
Disallow: /admin/

Sitemap: https://your-domain.com/sitemap.xml
```

The `Allow: /funnel` (landing page) is intentional — the landing page is indexable. The sub-routes (`/funnel/start`, `/funnel/preview`, etc.) are disallowed to avoid wasting crawl budget on pages that cannot be accessed by bots anyway.

### Crawl Budget Optimization

Crawl budget is the number of URLs Google will crawl per day. For a site with 1,000+ pages, efficient crawl budget use is critical.

**Rules enforced:**

1. **No parameter-based URLs in index.** `/plan/lose-weight?source=email` and `/plan/lose-weight` should resolve to the same canonical. `?source=` and `?ref=` params should be passed via headers or stripped before canonical resolution.

2. **Paginated content uses `rel="next"/"prev"` correctly.** Blog index pagination: `/blog` (page 1), `/blog?page=2` (with prev/next link tags).

3. **Internal search pages are noindexed.** If a search UI exists at `/search?q=keto`, it must have `<meta name="robots" content="noindex">`.

4. **404 pages are monitored.** Dead links waste crawl budget. Use Google Search Console to identify and fix 404s on formerly-indexed pages.

5. **Redirect chains are eliminated.** `/old-url` → 301 → `/new-url`. Never `/old-url` → 301 → `/intermediate` → 301 → `/new-url`. Each hop in a chain wastes 15–20% of link equity.

### Page Performance Targets

Google's Core Web Vitals directly impact search rankings:

| Metric | Target | Strategy |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | SSG/ISR for content pages; avoid full SSR on large pages |
| FID / INP (Interaction to Next Paint) | < 200ms | Push `'use client'` to leaf components only; no heavy JS on content pages |
| CLS (Cumulative Layout Shift) | < 0.1 | Explicit dimensions on all images (`width` + `height`); no layout-shifting ads |
| TTFB (Time to First Byte) | < 800ms | Edge caching via Vercel CDN; ISR pages served from cache |

**Implementation rules for SEO pages:**
- All pSEO pages: Server Components only. No `'use client'` on page.tsx. Interactive elements (calorie widget, "Get your plan" CTA) are isolated to small client leaf components.
- All images: use `next/image` with explicit `width` and `height`. No raw `<img>` tags.
- All fonts: use `next/font` — eliminates FOUT and reduces CLS from web font loading.
- No third-party scripts that block render (analytics, chat widgets). Load asynchronously with `<Script strategy="lazyOnload">`.

---

## 9. Data Models

### `seo_page`

Records all programmatically-generated pages and their indexing status. Used for sitemap generation and monitoring.

```sql
CREATE TABLE seo_page (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR NOT NULL UNIQUE,          -- e.g. 'lose-weight-keto-pcos-women'
  page_type       VARCHAR NOT NULL CHECK (page_type IN ('plan', 'blog', 'result', 'static')),
  title           VARCHAR NOT NULL,
  meta_description VARCHAR(165),
  dimensions      JSONB NOT NULL DEFAULT '{}',       -- { goal, diet, condition, gender, age }
  canonical_url   VARCHAR NOT NULL,
  index_status    VARCHAR NOT NULL DEFAULT 'pending'
                  CHECK (index_status IN ('pending', 'submitted', 'indexed', 'deindexed')),
  first_indexed_at TIMESTAMP,
  last_crawled_at  TIMESTAMP,
  impressions     INTEGER NOT NULL DEFAULT 0,        -- from Search Console sync
  clicks          INTEGER NOT NULL DEFAULT 0,
  avg_position    NUMERIC(5,2),
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_page_type ON seo_page(page_type);
CREATE INDEX idx_seo_page_index_status ON seo_page(index_status);
```

### `blog_post`

```sql
CREATE TABLE blog_post (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR NOT NULL UNIQUE,
  title           VARCHAR NOT NULL,
  description     VARCHAR(165),
  content_path    VARCHAR NOT NULL,              -- relative path to MDX file
  author          VARCHAR NOT NULL DEFAULT 'AI Metabolic Coach Team',
  category        VARCHAR NOT NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  keywords        TEXT[] NOT NULL DEFAULT '{}',
  related_plan_slugs TEXT[] NOT NULL DEFAULT '{}',
  featured_image  VARCHAR,
  status          VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at    TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT now(),
  word_count      INTEGER,
  read_time_minutes INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_post_status_published ON blog_post(status, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_blog_post_tags ON blog_post USING gin(tags);
```

### `user_generated_page`

```sql
CREATE TABLE user_generated_page (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug            VARCHAR NOT NULL UNIQUE,           -- 'sarah-lost-12kg-in-10-weeks'
  display_name    VARCHAR,                           -- first name only, or null if hidden
  total_lost_kg   NUMERIC(5,2) NOT NULL,
  duration_weeks  INTEGER NOT NULL,
  adherence_rate  NUMERIC(5,2),
  streak_peak     INTEGER,
  protocol        VARCHAR,                           -- 'keto', 'mediterranean', etc.
  goal_type       VARCHAR,                           -- from user's onboarding goal
  user_quote      TEXT,                              -- optional user-provided quote
  content         JSONB NOT NULL,                    -- snapshot of page content at publish time
  public          BOOLEAN NOT NULL DEFAULT false,
  og_image_url    VARCHAR,
  index_status    VARCHAR NOT NULL DEFAULT 'pending',
  published_at    TIMESTAMP,
  unpublished_at  TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_ugc_page_public ON user_generated_page(public, published_at DESC) WHERE public = true;
```

### `keyword_mapping`

```sql
CREATE TABLE keyword_mapping (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword         VARCHAR NOT NULL UNIQUE,
  search_volume   INTEGER,                       -- monthly searches (manually entered or from API)
  competition     VARCHAR CHECK (competition IN ('low', 'medium', 'high')),
  intent          VARCHAR CHECK (intent IN ('informational', 'commercial', 'navigational', 'transactional')),
  target_page_slug VARCHAR REFERENCES seo_page(slug) ON DELETE SET NULL,
  target_page_type VARCHAR,
  current_position NUMERIC(5,2),                -- latest avg position from Search Console
  tracked         BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_keyword_mapping_tracked ON keyword_mapping(tracked, current_position) WHERE tracked = true;
```

---

## 10. APIs

### New Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/seo/pages` | GET | None | Return list of all indexed pSEO page slugs (for sitemap) |
| `/seo/pages/:slug` | GET | None | Return metadata + content data for a pSEO page |
| `/seo/ugc/share` | POST | JWT | Create or update user's UGC result page (opt-in publish) |
| `/seo/ugc/unshare` | DELETE | JWT | Unpublish user's UGC result page |
| `/seo/ugc/preview` | GET | JWT | Return preview data for user's draft UGC page (before publishing) |
| `/seo/ugc/:slug` | GET | None | Return public UGC page content (for rendering `/results/[slug]`) |
| `/seo/blog/posts` | GET | None | Return paginated published blog post list (for `/blog` index) |
| `/seo/blog/posts/:slug` | GET | None | Return single post metadata + content path |
| `/seo/blog/posts` | POST | Admin token | Publish or update a blog post (triggers ISR revalidation) |
| `/seo/keywords` | GET | Admin token | Return keyword tracking data |
| `/seo/keywords` | PUT | Admin token | Update keyword positions (from Search Console sync) |
| `/seo/revalidate` | POST | CRON_SECRET | Trigger ISR revalidation for stale pSEO pages |

### Key Response Shapes

**`GET /seo/pages/:slug`** — used by `page.tsx` in `generateMetadata()` and page render:
```json
{
  "slug": "lose-weight-keto-pcos-women-30s",
  "title": "Keto Meal Plan for Women in Their 30s with PCOS to Lose Weight",
  "meta_description": "A keto plan built for women with PCOS. Get your exact calorie target, macros, and 7-day schedule in 3 questions.",
  "dimensions": { "goal": "lose-weight", "diet": "keto", "condition": "pcos", "gender": "women", "age": "30s" },
  "canonical_url": "https://domain.com/plan/lose-weight-keto-pcos-women-30s",
  "content_blocks": {
    "h1": "Keto Meal Plan for Women with PCOS in Their 30s to Lose Weight",
    "intro": "...",
    "foods_to_prioritize": ["Avocado", "Salmon", "Eggs", "Leafy greens", "Almonds", "Berries", "Olive oil"],
    "common_mistakes": [...],
    "faq": [{ "q": "...", "a": "..." }],
    "related_plan_slugs": ["lose-weight-keto", "lose-weight-pcos", "lose-weight-mediterranean-pcos"]
  }
}
```

**`POST /seo/ugc/share`**:
```json
Request:  {
  "display_name_visible": true,
  "user_quote": "Having a plan that adapted to my biometrics made the difference."
}
Response: {
  "slug": "sarah-lost-12kg-in-10-weeks",
  "url": "https://domain.com/results/sarah-lost-12kg-in-10-weeks",
  "public": true,
  "index_status": "pending"
}
```

---

## 11. Performance Optimization

### Rendering Architecture for SEO Pages

All three SEO page types (pSEO, blog, UGC) use the same rendering principle: **maximum static content, minimum client JavaScript**.

```
Page component tree for /plan/[slug]:
  page.tsx (Server Component — no JS bundle)
    ├── PlanHero (Server Component)
    ├── ContentBlock (Server Component)
    ├── FAQBlock (Server Component)
    ├── RelatedPlans (Server Component)
    └── ConversionCTA (Client Component ← isolated leaf)
         └── Only this component adds to the client JS bundle
```

The `ConversionCTA` is the only client component because it needs browser events (button clicks, form submission). Everything above it is pure server-rendered HTML.

### Image Optimization

- All `<img>` tags replaced with `next/image`
- Blog featured images: explicitly sized (1200×630 for OG, 800×400 for article hero)
- OG images: served from `/api/og/[type]/[slug]` Edge Function, cached
- UGC result page stats image: generated at publish time and stored as Vercel Blob URL (not regenerated on every visit)
- No images larger than 200KB for above-the-fold content

### Font Loading

```
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'
// or Geist if already in the stack
```

`next/font` preloads fonts and inlines `font-display: optional` — eliminates Cumulative Layout Shift from web fonts.

### Core Web Vitals Monitoring

Add `@vercel/analytics` and `@vercel/speed-insights` to layout (Phase 11 likely already has analytics). Speed Insights reports real-user CWV data broken down by page route — directly shows which SEO pages are underperforming.

---

## 12. Execution Order

### Phase 1 — SEO Foundation
1. Alembic migration: create `seo_page`, `blog_post`, `user_generated_page`, `keyword_mapping`
2. Create `app/robots.ts` and `app/sitemap.ts` (Next.js App Router)
3. Create `lib/seo/metadata.ts` — shared metadata generation functions (title, description, OG, schema.org)
4. Create `lib/seo/pSEO-combinations.ts` — dimension definitions and slug computation
5. Create `lib/seo/related-pages.ts` — related plan computation from slug dimensions
6. Create `lib/seo/schema.ts` — JSON-LD schema generators per page type

### Phase 2 — pSEO Page Engine
7. Create `content/plans/templates/` directory with 3 template files (content blocks parameterized by dimension)
8. Implement `GET /seo/pages/:slug` endpoint
9. Seed `seo_page` table with all initial slug combinations (migration-time seed)
10. Implement `app/plan/[slug]/page.tsx` with `generateStaticParams` + `generateMetadata` + ISR (revalidate: 604800)
11. Implement pSEO page layout: hero + content blocks + FAQ + related plans + CTA
12. Implement `/api/og/plan/[slug]` route for dynamic OG image generation
13. Verify 3 sample pages render correctly + check Lighthouse scores

### Phase 3 — Metadata System
14. Implement `generateMetadata()` for all existing public pages (`/`, `/pricing`, `/funnel`)
15. Add Open Graph tags to all public pages
16. Add JSON-LD structured data to pSEO pages (WebPage, FAQPage, BreadcrumbList)
17. Add canonical link to all pages
18. Add `<meta name="robots" content="noindex">` to all app/funnel sub-routes
19. Validate with Google Rich Results Test

### Phase 4 — Blog Engine
20. Create `content/blog/` directory structure
21. Implement `lib/content/blog.ts` — `getBlogPost(slug)`, `getAllBlogPosts()`, `getRelatedPosts(slug, tags)`
22. Implement `GET /seo/blog/posts` and `GET /seo/blog/posts/:slug`
23. Implement `app/blog/page.tsx` (index, ISR revalidate: 86400)
24. Implement `app/blog/[slug]/page.tsx` (SSG + on-demand revalidation)
25. Implement `generateMetadata()` for blog routes (Article schema, OG)
26. Implement `/api/og/blog/[slug]` OG image route
27. Write 4 initial blog posts (1 case study, 1 data insight, 2 educational) to seed the blog

### Phase 5 — UGC SEO System
28. Implement `POST /seo/ugc/share`, `DELETE /seo/ugc/unshare`, `GET /seo/ugc/preview`
29. Implement `GET /seo/ugc/:slug` (public page data endpoint)
30. Implement `app/results/[slug]/page.tsx` (ISR revalidate: 86400)
31. Implement `generateMetadata()` for result pages
32. Implement `/api/og/result/[slug]` OG image route
33. Build `/settings/share` UI (toggle + preview + quote input)
34. Wire Phase 13 milestone events to surface the "Share your results" prompt
35. Add UGC pages to sitemap generation

### Phase 6 — Internal Linking
36. Implement related plans section on all pSEO pages (uses `lib/seo/related-pages.ts`)
37. Add "Related plan" links to blog post template (from `relatedPlanSlugs` frontmatter)
38. Add UGC result page → pSEO page link (from `user_generated_page.protocol + goal_type`)
39. Add featured pSEO plans to landing page (`/funnel`)
40. Implement breadcrumb component (visual + schema.org)
41. Audit all pages for orphan status — ensure every pSEO page has at least one inbound link

### Phase 7 — Indexing Optimization
42. Submit sitemap to Google Search Console
43. Implement `POST /seo/revalidate` cron endpoint (weekly, revalidates stale pSEO pages)
44. Add Vercel Speed Insights to layout (CWV monitoring)
45. Run Lighthouse audit on 5 representative pages; fix any LCP > 2.5s or CLS > 0.1 issues
46. Set up keyword tracking workflow (manual or Search Console API sync into `keyword_mapping`)

---

## 13. Documentation

### SEO Architecture

The Phase 14 SEO system is a content moat, not a content spike. A content spike (publishing 50 articles at launch) decays quickly. A content moat compounds: each new blog post, each new pSEO page, and each new UGC result page increases the total indexed surface area, which increases overall domain authority, which improves rankings for all existing pages.

The three content flywheels work together:

**pSEO pages** target specific intent queries that users type with a specific need ("keto meal plan for PCOS women over 40"). These pages convert well because the visitor's need matches the page exactly. Each page is lightweight to produce (parameterized template) but highly targeted.

**Blog posts** target informational queries earlier in the funnel ("why am I not losing weight on keto"). These visitors are researching, not ready to convert. Blog posts build trust, earn backlinks (the currency of domain authority), and link users toward pSEO pages and the funnel.

**UGC result pages** generate social proof at scale. Each user who shares their results creates a unique page that: (a) ranks for their name + result combination, (b) provides genuine testimonial content that no competitor can replicate, (c) generates natural backlinks when shared on social media.

### pSEO Strategy

**Why programmatic, not manual?**

Manual content creation at scale is expensive and slow. A team that produces 4 posts/month would need 25 years to write 1,200 unique landing pages. Programmatic generation creates those pages in hours by systematically combining targeting dimensions with parameterized templates.

**The duplicate content trap:**

Google penalizes pages that are functionally identical except for a few swapped words. The pSEO approach avoids this by:
1. Generating pages only for dimensions where the content is genuinely different (a keto plan for PCOS is meaningfully different from a Mediterranean plan for PCOS — different food lists, different macros, different considerations)
2. Using 3 distinct templates (single-dimension, goal+diet, goal+diet+condition) that vary in depth and specificity
3. Never generating a page unless there is search demand evidence for that combination (keyword research validates each dimension combination before building)

**Content freshness:**

pSEO pages are ISR with 7-day revalidation. Content blocks are static template strings. What gets updated: related UGC result pages linked from each plan page are fetched at render time and may change as new users share results. This gives pSEO pages a source of fresh, genuine user-generated social proof without requiring the core content to change.

### Metadata Rules

**Golden rules for metadata:**

1. Every title is unique across the site. Duplicate titles confuse crawlers and split authority.
2. Every description ends with an implicit or explicit CTA. "Get your plan in 3 questions" or "Learn what's actually working."
3. No keyword stuffing in titles. One primary keyword, naturally integrated. Google's ML reads intent, not keyword density.
4. `og:image` must be 1200×630px minimum. Below this, social platforms may not show the image card.
5. `og:image` must be publicly accessible (no auth required). Social crawlers do not send cookies.
6. JSON-LD structured data must be validated before deployment. Use Google Rich Results Test. Invalid JSON-LD is silently ignored — it provides no benefit but doesn't harm either.

### Internal Linking Strategy

Internal linking serves two functions that are often confused:

**SEO function:** Links pass authority ("link equity") from one page to another. A blog post with 50 external backlinks passes some of that authority to every page it links to internally. This is why high-authority blog posts should link to the highest-priority conversion pages.

**Crawl function:** Search engine bots discover pages by following links. A page that is not linked from anywhere else on the site is an orphan — bots may never find it, even if it's in the sitemap. The sitemap is a fallback, not a substitute for internal links.

**Implementation:** Internal links are rendered as anchor tags in Server Components. No JavaScript required. This ensures bots can follow them without executing JS.

### Content Strategy

**Publishing discipline:** Consistency matters more than volume. Four posts per month, every month, for 12 months compounds into an authoritative site. Twenty posts published in one week, then nothing for 6 months, does not.

**What earns backlinks (the most important metric):**
- Data-driven posts with original research (no other site has the data)
- Free tools (calculators, planners — people link to tools because they're useful)
- Controversial or counter-intuitive takes with evidence ("Why 1,200 calories is the wrong target for most women")

**What ranks but doesn't earn backlinks:**
- Educational explainers (necessary for long-tail traffic, but rarely get linked to)
- pSEO template pages (rank for long-tail, but rarely earn organic backlinks)

Both are needed. The strategy is to produce a mix, not only one type.

### UGC SEO Model

The UGC result pages are the most defensible content asset in the system. Competitors cannot copy them because the data is real and user-specific. Over time, as more users share results, the volume of indexed result pages grows without any incremental editorial effort.

**Quality signals UGC pages send to Google:**
- Unique content (each page is genuinely different)
- User-generated (signals real human experience)
- Freshness (published as milestones are reached, not all at once)
- Social shares (when users share their results, Google sees social signals and referral traffic)

**Quality controls to prevent spam:**
- Minimum 1.0 kg lost and 10 check-ins required before page is shareable
- Account must be 14+ days old
- Users can only have one active result page
- Result pages are reviewed for integrity before Google Search Console submission (automated check: weight change plausibility vs timeline)

### Indexing Optimization

**Core principle:** Google has a finite crawl budget for every domain. Directing that budget toward high-value pages (pSEO, blog, UGC) and away from low-value pages (app UI, funnel sub-routes, paginated search results) maximizes the indexing return on each crawl.

**Monitoring cadence:**
- Weekly: Check Search Console coverage report for new errors (404s, soft 404s, crawl anomalies)
- Monthly: Review Core Web Vitals report by page group (pSEO pages, blog, UGC)
- Quarterly: Content gap analysis (queries in positions 11–30, queries with impressions but no clicks)
- Annually: Full crawl audit (Screaming Frog or equivalent) — identify orphan pages, redirect chains, duplicate content

### Data Models Reference

See Section 9 for full SQL definitions. Key design notes:

- `seo_page` serves double duty as both a registry of all programmatic pages and a performance tracking store (impressions, clicks, position from Search Console). This avoids a separate analytics table.
- `user_generated_page.content` is a JSONB snapshot taken at publish time. Changes to the user's underlying data (new check-ins, more weight loss) do not automatically update the page — the user must explicitly update their public page. This prevents stale snapshots being silently served.
- `keyword_mapping` is a lightweight tracking table, not a full SEO platform. For early-stage tracking, manually entering keyword data monthly is sufficient. Automation via the Google Search Console API can be added later.

### API Reference

See Section 10 for full endpoint list and shapes.

**SEO-specific error codes:**

| Code | HTTP Status | Meaning |
|---|---|---|
| `INSUFFICIENT_PROGRESS` | 422 | User tried to publish UGC page but does not meet minimum requirements (< 1kg lost or < 10 check-ins) |
| `SLUG_CONFLICT` | 409 | Generated slug already exists — auto-resolution appends "-2" suffix |
| `PAGE_DEINDEXED` | 200 | Public page exists but is marked noindex (user has unpublished) — return page data with noindex flag |
| `INVALID_PSEO_SLUG` | 404 | Requested pSEO slug does not match any valid dimension combination |

---

## New File Tree

```
frontend/app/
  plan/
    [slug]/
      page.tsx                    pSEO page with generateStaticParams + generateMetadata
      components/
        plan-hero.tsx             H1 + intro + calorie CTA widget
        content-blocks.tsx        Parameterized food lists, common mistakes
        faq-block.tsx             FAQ section + JSON-LD
        related-plans.tsx         Adjacent dimension links
        conversion-cta.tsx        Client Component — CTA button + funnel redirect

  blog/
    page.tsx                      Blog index (ISR)
    [slug]/
      page.tsx                    Blog post (SSG + on-demand revalidation)
      components/
        article-content.tsx       MDX renderer
        table-of-contents.tsx     Auto-generated from headings
        related-posts.tsx         Tag-matched adjacent posts
        in-content-cta.tsx        Contextual upgrade prompt

  results/
    [slug]/
      page.tsx                    UGC result page (ISR)
      components/
        result-stats-block.tsx    Kg lost, weeks, adherence rate
        user-quote.tsx            Optional user quote card
        related-plan-link.tsx     Link to matching pSEO page

  api/
    og/
      plan/[slug]/
        route.ts                  OG image for pSEO pages
      blog/[slug]/
        route.ts                  OG image for blog posts
      result/[slug]/
        route.ts                  OG image for UGC pages

  settings/
    share/
      page.tsx                    UGC share settings + preview

  sitemap.ts                      Dynamic sitemap (App Router)
  robots.ts                       robots.txt (App Router)

frontend/lib/
  seo/
    metadata.ts                   Shared title/description/OG generators
    pSEO-combinations.ts          Dimension definitions + slug builder
    related-pages.ts              Adjacent dimension computation
    schema.ts                     JSON-LD generators per page type
    og-templates.tsx              ImageResponse templates for OG images
  content/
    blog.ts                       getBlogPost, getAllBlogPosts, getRelatedPosts

content/
  blog/
    2026-04-07-calorie-deficit-signs.mdx
    2026-04-14-10000-users-plateau-insights.mdx
    [more posts...]
  plans/
    templates/
      goal.ts                     Single-dimension content blocks
      goal-diet.ts                Goal + diet content blocks
      goal-diet-condition.ts      Goal + diet + condition content blocks
    data/
      foods-by-dimension.ts       Food lists per dimension combination
      faq-by-dimension.ts         FAQ Q&As per dimension combination

backend/app/
  api/v1/endpoints/
    seo.py                        All /seo/* endpoints
  models/
    seo.py                        SeoPage, BlogPost, UserGeneratedPage, KeywordMapping
  schemas/
    seo.py
  services/
    seo_service.py                Slug generation, UGC publish/unpublish, sitemap data
    ugc_service.py                Progress snapshot, eligibility check

backend/alembic/versions/
  xxxx_phase14_seo_tables.py
```

---

## Environment Variables — Phase 14

```bash
# OG image generation (if using Satori/vercel/og)
# No additional env vars needed — uses Vercel Edge runtime

# Google Search Console API (optional, for keyword sync)
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://your-domain.com
GOOGLE_SERVICE_ACCOUNT_KEY=...     # JSON key for Search Console API access

# Cron (shared with Phase 12/13)
CRON_SECRET=...

# Site URL (needed for canonical URL generation and sitemap)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## Key Decisions

1. **MDX files for blog content, not a headless CMS.** Eliminates a third-party dependency at launch. Switching to a CMS later requires only updating `lib/content/blog.ts`. The abstraction is in place from day one.

2. **pSEO pages use ISR (7-day revalidation), not SSG.** At 740+ pages, full regeneration on every deploy would take too long. ISR generates pages on first request and revalidates in the background. New slug combinations are served within seconds of the first visit.

3. **Template content is static, not AI-generated per request.** AI-generated pSEO content at request time would: (a) cost significant API credits at scale, (b) produce inconsistent content, (c) create latency on first render. Template strings parameterized by dimension are free, consistent, and instant.

4. **UGC pages snapshot data at publish time.** Live data on public pages would leak private user information as it changes. Snapshots give users control: they decide when their public page is updated.

5. **No content behind login on SEO pages.** Every character of content on pSEO, blog, and UGC pages must be crawlable without authentication. Paywalled content on public pages is invisible to Google.

6. **Funnel sub-routes are noindexed.** The `/funnel/start`, `/funnel/preview`, `/funnel/upgrade` pages are conversion tools, not content assets. Indexing them wastes crawl budget and may harm rankings by adding low-quality pages to the index.

7. **Internal links are server-rendered anchors.** No JavaScript-only links on SEO-critical pages. Server Components ensure links are in the initial HTML payload.

---

## Assumptions

- The site is deployed on a custom domain (not `vercel.app`). `vercel.app` subdomains have limited Google trust. A custom domain is required for serious SEO.
- `NEXT_PUBLIC_SITE_URL` is set to the production domain. This is required for canonical URLs and sitemap generation to reference the correct origin.
- The pSEO combination config (`lib/seo/pSEO-combinations.ts`) is manually curated for the initial launch. Automated expansion based on keyword research comes in a later iteration.
- Google Search Console is verified for the domain before Phase 14 goes live. The sitemap submission and indexing API calls require verified ownership.
- The blog publishing workflow for MVP is: write MDX file → commit to repo → deploy triggers Vercel build → on-demand revalidation endpoint hit → blog index updated. This is a developer workflow. A non-developer editorial workflow requires a CMS.
- UGC result pages will not generate meaningful SEO volume until the user base reaches ~1,000 active users with measurable progress. Phase 14 builds the infrastructure; the SEO flywheel gains momentum over 6–12 months.

---

## Confidence

| Area | Confidence | Notes |
|---|---|---|
| pSEO page generation architecture | High | Next.js ISR + generateStaticParams is well-established |
| Metadata implementation (OG, schema.org) | High | Standard Next.js App Router patterns |
| Blog engine (MDX + ISR) | High | Well-proven stack |
| UGC result pages | High | Technical implementation is straightforward |
| Ranking impact of pSEO pages within 90 days | Medium | New domains take 3–6 months for Google trust; depends on existing domain authority |
| Internal linking impact on crawl efficiency | High | Directly measurable in Search Console |
| UGC SEO volume at scale | Medium | Depends on user base size and opt-in rate |
| Core Web Vitals targets (LCP < 2.5s) | High | ISR + Server Components makes this achievable; OG image Edge caching prevents latency spikes |

---

## Review Checklist

- ✅ Task 14.1.1 — Dynamic page generation: pSEO engine, URL structure, 3 templates, metadata per page
- ✅ Task 14.2.1 — Blog & content: MDX engine, 5 content types, weekly cadence, category taxonomy
- ✅ Task 14.3.1 — UGC SEO: opt-in result pages, slug generation, content snapshot, sharing + OG images
- ✅ Programmatic SEO conceptually implemented: dimension combinations, slug builder, ISR generation
- ✅ Blog/content system defined: MDX, frontmatter schema, CMS migration path
- ✅ UGC SEO strategy included: consent flow, eligibility rules, quality controls
- ✅ Internal linking optimized: 5-rule linking graph, breadcrumbs, no orphan pages
- ✅ Metadata system robust: title formulas, OG, JSON-LD, canonical URLs, noindex rules
- ✅ Indexing optimized: sitemap, robots.txt, crawl budget rules, CWV targets, monitoring cadence
- ✅ All data models defined (4 tables)
- ✅ All APIs defined (11 endpoints)
- ✅ Execution order specified (7 phases, 46 numbered steps)
- ✅ Documentation complete (9 documentation sections)
- ✅ File saved correctly
