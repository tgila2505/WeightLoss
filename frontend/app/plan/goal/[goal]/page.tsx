import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GOAL_TYPES, DIET_TYPES, buildPseoSlug, buildPseoH1, type GoalType } from '@/lib/seo/pseo-combinations'
import { buildMetadata } from '@/lib/seo/metadata'
import { buildWebPageSchema, buildBreadcrumbSchema } from '@/lib/seo/schema'

export const revalidate = 604800

interface Props { params: Promise<{ goal: string }> }

export async function generateStaticParams() {
  return GOAL_TYPES.map((goal) => ({ goal }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { goal } = await params
  if (!GOAL_TYPES.includes(goal as GoalType)) return {}

  const h1 = buildPseoH1({ goalType: goal })
  const title = `${h1} — All Diet Plans | AI Metabolic Coach`
  const description = `Browse all personalised diet plans to ${h1.toLowerCase()}. Choose the dietary approach that fits your lifestyle and get AI-optimised macro targets.`
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Plans', path: '/plan' },
    { name: h1, path: `/plan/goal/${goal}` },
  ]
  const schemas = [
    buildWebPageSchema({ name: title, description, path: `/plan/goal/${goal}` }),
    buildBreadcrumbSchema(breadcrumbs),
  ]
  const base = buildMetadata({ title, description, path: `/plan/goal/${goal}` })
  return { ...base, other: { 'script:ld+json': schemas.map((s) => JSON.stringify(s)) } }
}

export default async function GoalHubPage({ params }: Props) {
  const { goal } = await params
  if (!GOAL_TYPES.includes(goal as GoalType)) return notFound()

  const h1 = buildPseoH1({ goalType: goal })

  return (
    <main className="min-h-screen bg-white">
      <nav aria-label="Breadcrumb" className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li><Link href="/" className="hover:text-blue-600 transition-colors">Home</Link></li>
            <li><span aria-hidden="true">›</span></li>
            <li><Link href="/plan" className="hover:text-blue-600 transition-colors">Plans</Link></li>
            <li><span aria-hidden="true">›</span></li>
            <li className="text-slate-700 font-medium">{h1}</li>
          </ol>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">{h1}</h1>
        <p className="text-slate-600 mb-8">
          Choose a dietary approach and get a personalised AI plan with macro targets, food lists, and expert guidance.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* General plan — no specific diet */}
          <Link
            href={`/plan/${goal}`}
            className="flex items-center justify-between px-4 py-4 rounded-xl border border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 transition-colors group"
          >
            <div>
              <p className="font-semibold text-blue-800 group-hover:text-blue-900">General Plan</p>
              <p className="text-xs text-blue-600 mt-0.5">No specific diet — flexible approach</p>
            </div>
            <span className="text-blue-300 group-hover:text-blue-500 ml-2">→</span>
          </Link>

          {DIET_TYPES.map((diet) => {
            const slug = buildPseoSlug({ goalType: goal, dietType: diet })
            const planH1 = buildPseoH1({ goalType: goal, dietType: diet })
            return (
              <Link
                key={diet}
                href={`/plan/${slug}`}
                className="flex items-center justify-between px-4 py-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-blue-700">{planH1}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{diet.replace(/-/g, ' ')} approach</p>
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
