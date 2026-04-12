import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildArticleSchema, buildBreadcrumbSchema } from '@/lib/seo/schema'

export const revalidate = 86400 // 24 hours

interface UgcData {
  slug: string
  title: string | null
  kg_lost: number | null
  weeks_taken: number | null
  diet_type: string | null
  testimonial: string | null
  view_count: number
  display_name: string | null
}

interface Props {
  params: Promise<{ slug: string }>
}

async function fetchUgcPage(slug: string): Promise<UgcData | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  try {
    const res = await fetch(`${base}/seo/ugc/${slug}`, {
      next: { revalidate: 86400, tags: ['ugc-pages', `ugc-${slug}`] },
    })
    if (!res.ok) return null
    return res.json() as Promise<UgcData>
  } catch {
    return null
  }
}

async function fetchUgcSlugs(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  try {
    const res = await fetch(`${base}/seo/ugc/slugs`, {
      next: { revalidate: 86400, tags: ['ugc-pages'] },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { slugs: string[] }
    return data.slugs
  } catch {
    return []
  }
}

export async function generateStaticParams() {
  const slugs = await fetchUgcSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await fetchUgcPage(slug)
  if (!page) return {}

  const title = page.title ?? 'Weight Loss Success Story'
  const kgLost = page.kg_lost ? `${Math.round(page.kg_lost)} kg` : 'significant weight'
  const weeks = page.weeks_taken ? `${page.weeks_taken} weeks` : 'a few weeks'
  const description = `Real weight loss result: ${kgLost} lost in ${weeks}${page.diet_type ? ` on a ${page.diet_type.replace(/-/g, ' ')} plan` : ''}. Get your personalised plan today.`

  const base = buildMetadata({
    title: `${title} | WeightLoss App`,
    description,
    path: `/results/${slug}`,
    ogImage: `/api/og/result/${slug}`,
  })

  const schema = buildArticleSchema({
    title,
    description,
    path: `/results/${slug}`,
    ...(page.display_name ? { author: page.display_name } : {}),
  })
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Results', path: '/results' },
    { name: title, path: `/results/${slug}` },
  ]

  return {
    ...base,
    other: {
      'script:ld+json': [
        JSON.stringify(schema),
        JSON.stringify(buildBreadcrumbSchema(breadcrumbs)),
      ],
    },
  }
}

export default async function UgcResultPage({ params }: Props) {
  const { slug } = await params
  const page = await fetchUgcPage(slug)
  if (!page) return notFound()

  const title = page.title ?? 'Weight Loss Success Story'
  const kgLost = page.kg_lost ? Math.round(page.kg_lost) : null
  const dietLabel = page.diet_type ? page.diet_type.replace(/-/g, ' ') : null

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Results', path: '/results' },
    { name: title, path: `/results/${slug}` },
  ]

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-2">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">›</span>}
                {i < breadcrumbs.length - 1 ? (
                  <Link href={crumb.path} className="hover:text-blue-600 transition-colors">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="text-slate-700 font-medium truncate max-w-[200px]">{crumb.name}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero stats */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl px-6 py-10 text-white mb-10">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-4">
            Real result
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">{title}</h1>
          <div className="flex flex-wrap gap-4">
            {kgLost !== null && (
              <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
                <div className="text-3xl font-bold">{kgLost} kg</div>
                <div className="text-blue-200 text-xs mt-0.5">lost</div>
              </div>
            )}
            {page.weeks_taken !== null && (
              <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
                <div className="text-3xl font-bold">{page.weeks_taken}</div>
                <div className="text-blue-200 text-xs mt-0.5">weeks</div>
              </div>
            )}
            {dietLabel && (
              <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
                <div className="text-base font-semibold capitalize">{dietLabel}</div>
                <div className="text-blue-200 text-xs mt-0.5">diet</div>
              </div>
            )}
          </div>
        </section>

        {/* Testimonial */}
        {page.testimonial && (
          <section className="mb-10">
            <blockquote className="border-l-4 border-blue-300 pl-5 py-2">
              <p className="text-slate-700 text-lg leading-relaxed italic">&ldquo;{page.testimonial}&rdquo;</p>
            </blockquote>
          </section>
        )}

        {/* How it works */}
        <section className="bg-slate-50 rounded-2xl p-6 mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4">How it works</h2>
          <ol className="space-y-3">
            {[
              'Answer 3 quick questions about your body and goals',
              'Get your personalised daily calorie and macro target',
              'Follow your AI-optimised plan and track weekly progress',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-slate-600 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        {/* Related plan link */}
        {dietLabel && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Related plan</h2>
            <Link
              href={`/plan/lose-weight-${page.diet_type}`}
              className="flex items-center justify-between px-4 py-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 capitalize">
                Lose weight on {dietLabel}
              </span>
              <span className="text-slate-300 group-hover:text-blue-400">→</span>
            </Link>
          </section>
        )}

        {/* CTA */}
        <section className="bg-slate-900 rounded-2xl px-6 py-10 text-center">
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
