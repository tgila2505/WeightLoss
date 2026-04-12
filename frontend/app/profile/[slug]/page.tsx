import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { UgcCtaButton } from '@/components/ugc-cta-button'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildBreadcrumbSchema, buildPersonSchema } from '@/lib/seo/schema'

export const revalidate = 86400 // 24 hours

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface ProfileData {
  display_name: string
  kg_lost: number | null
  weeks_taken: number | null
  diet_type: string | null
  member_since: string
  title: string | null
  testimonial: string | null
  slug: string
}

interface Props {
  params: Promise<{ slug: string }>
}

async function fetchProfile(slug: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`${API_BASE}/seo/profile/${slug}`, {
      next: { revalidate: 86400, tags: ['ugc-pages', `profile-${slug}`] },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return res.json() as Promise<ProfileData>
  } catch {
    return null
  }
}

async function fetchProfileSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/seo/ugc/slugs`, {
      next: { revalidate: 3600, tags: ['sitemap', 'ugc-pages'] },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { slugs: string[] }
    return data.slugs
  } catch {
    return []
  }
}

export async function generateStaticParams() {
  const slugs = await fetchProfileSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const profile = await fetchProfile(slug)
  if (!profile) return {}

  const kgLost = profile.kg_lost ? `${Math.round(profile.kg_lost)} kg` : 'significant weight'
  const weeks = profile.weeks_taken ? ` in ${profile.weeks_taken} weeks` : ''
  const dietSuffix = profile.diet_type
    ? ` on a ${profile.diet_type.replace(/-/g, ' ')} diet`
    : ''
  const description = `${profile.display_name} lost ${kgLost}${weeks}${dietSuffix}. Member since ${profile.member_since}. Start your own journey today.`
  const title = `${profile.display_name}'s Weight Loss Journey | WeightLoss App`

  const base = buildMetadata({
    title,
    description,
    path: `/profile/${slug}`,
    ogImage: `/api/og/result/${slug}`,
  })

  const personSchema = buildPersonSchema({
    name: profile.display_name,
    description,
    path: `/profile/${slug}`,
  })

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Results', path: '/results' },
    { name: profile.display_name, path: `/profile/${slug}` },
  ]

  return {
    ...base,
    other: {
      'script:ld+json': [
        JSON.stringify(personSchema),
        JSON.stringify(buildBreadcrumbSchema(breadcrumbs)),
      ],
    },
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params
  const profile = await fetchProfile(slug)
  if (!profile) return notFound()

  const kgLost = profile.kg_lost ? Math.round(profile.kg_lost) : null
  const dietLabel = profile.diet_type ? profile.diet_type.replace(/-/g, ' ') : null

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Results', path: '/results' },
    { name: profile.display_name, path: `/profile/${slug}` },
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
                  <span className="text-slate-700 font-medium truncate max-w-[200px]">
                    {crumb.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl px-6 py-10 text-white mb-10">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-4">
            Member since {profile.member_since}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
            {profile.title ?? `${profile.display_name}'s Journey`}
          </h1>
          <div className="flex flex-wrap gap-4">
            {kgLost !== null && (
              <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
                <div className="text-3xl font-bold">{kgLost} kg</div>
                <div className="text-blue-200 text-xs mt-0.5">lost</div>
              </div>
            )}
            {profile.weeks_taken !== null && (
              <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
                <div className="text-3xl font-bold">{profile.weeks_taken}</div>
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
        {profile.testimonial && (
          <section className="mb-10">
            <blockquote className="border-l-4 border-blue-300 pl-5 py-2">
              <p className="text-slate-700 text-lg leading-relaxed italic">
                &ldquo;{profile.testimonial}&rdquo;
              </p>
            </blockquote>
          </section>
        )}

        {/* Related plan */}
        {profile.diet_type && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-3">
              {profile.display_name}&apos;s plan
            </h2>
            <Link
              href={`/plan/lose-weight-${profile.diet_type}`}
              className="flex items-center justify-between px-4 py-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 capitalize">
                Lose weight on {dietLabel}
              </span>
              <span className="text-slate-300 group-hover:text-blue-400">→</span>
            </Link>
          </section>
        )}

        {/* Full result page link */}
        <section className="mb-10">
          <Link
            href={`/results/${slug}`}
            className="text-sm text-blue-600 hover:underline"
          >
            View full result story →
          </Link>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 rounded-2xl px-6 py-10 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Start your own journey</h2>
          <p className="text-slate-400 text-sm mb-6">
            Get a free personalised calorie target built for your body in under 60 seconds.
          </p>
          <UgcCtaButton
            href="/funnel"
            label={dietLabel ? `Get my ${dietLabel} plan →` : 'Get my free plan →'}
            slug={slug}
          />
        </section>
      </div>
    </main>
  )
}
