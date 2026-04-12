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
