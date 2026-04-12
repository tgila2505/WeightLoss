import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GOAL_TYPES, DIET_TYPES, buildPseoSlug, buildPseoH1, type DietType } from '@/lib/seo/pseo-combinations'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildWebPageSchema, buildBreadcrumbSchema } from '@/lib/seo/schema'

export const revalidate = 604800

interface Props { params: Promise<{ diet: string }> }

export async function generateStaticParams() {
  return DIET_TYPES.map((diet) => ({ diet }))
}

function dietLabel(diet: string): string {
  return diet.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { diet } = await params
  if (!DIET_TYPES.includes(diet as DietType)) return {}

  const label = dietLabel(diet)
  const title = `${label} Diet Plans for Weight Loss | AI Metabolic Coach`
  const description = `Explore personalised ${label} diet plans for every weight loss goal. Get AI-optimised macro targets, food lists, and expert guidance tailored to your body.`
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Plans', path: '/plan' },
    { name: `${label} Plans`, path: `/plan/diet/${diet}` },
  ]
  const schemas = [
    buildWebPageSchema({ name: title, description, path: `/plan/diet/${diet}` }),
    buildBreadcrumbSchema(breadcrumbs),
  ]
  const base = buildMetadata({ title, description, path: `/plan/diet/${diet}` })
  return { ...base, other: { 'script:ld+json': schemas.map((s) => JSON.stringify(s)) } }
}

export default async function DietHubPage({ params }: Props) {
  const { diet } = await params
  if (!DIET_TYPES.includes(diet as DietType)) return notFound()

  const label = dietLabel(diet)

  return (
    <main className="min-h-screen bg-white">
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li><Link href="/" className="hover:text-blue-600 transition-colors">Home</Link></li>
            <li><span aria-hidden="true">›</span></li>
            <li><Link href="/plan" className="hover:text-blue-600 transition-colors">Plans</Link></li>
            <li><span aria-hidden="true">›</span></li>
            <li className="text-slate-700 font-medium">{label} Plans</li>
          </ol>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">{label} Diet Plans for Weight Loss</h1>
        <p className="text-slate-600 mb-8">
          Browse all {label} plans for every weight loss goal. Each plan includes personalised macro targets, foods to prioritise, and expert guidance.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GOAL_TYPES.map((goal) => {
            const slug = buildPseoSlug({ goalType: goal, dietType: diet })
            const h1 = buildPseoH1({ goalType: goal, dietType: diet })
            return (
              <Link
                key={goal}
                href={`/plan/${slug}`}
                className="flex items-center justify-between px-4 py-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-blue-700">{h1}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{goal.replace(/-/g, ' ')}</p>
                </div>
                <span className="text-slate-300 group-hover:text-blue-400 ml-2">→</span>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
