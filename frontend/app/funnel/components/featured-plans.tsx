import Link from 'next/link'

import { buildPseoSlug, buildPseoTitle } from '@/lib/seo/pseo-combinations'

const FEATURED = [
  { goalType: 'lose-weight' as const, dietType: 'keto' as const },
  { goalType: 'lose-weight' as const, dietType: 'mediterranean' as const },
  { goalType: 'lose-belly-fat' as const, dietType: 'intermittent-fasting' as const },
  { goalType: 'lose-weight' as const, dietType: 'low-carb' as const },
  { goalType: 'lose-10kg' as const, dietType: 'calorie-deficit' as const },
  { goalType: 'lose-weight' as const, dietType: 'plant-based' as const },
]

export function FeaturedPlans() {
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-2 text-center text-lg font-semibold text-slate-900">Popular plans</h2>
        <p className="mb-6 text-center text-sm text-slate-500">
          Explore personalised plans by goal and diet
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FEATURED.map(({ goalType, dietType }) => {
            const slug = buildPseoSlug({ goalType, dietType })
            const title = buildPseoTitle({ goalType, dietType })

            return (
              <Link
                key={slug}
                href={`/plan/${slug}`}
                className="group rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600 capitalize">
                  {dietType.replace(/-/g, ' ')}
                </p>
                <p className="text-sm leading-snug text-slate-700 group-hover:text-slate-900">
                  {title}
                </p>
              </Link>
            )
          })}
        </div>
        <div className="mt-5 text-center">
          <Link href="/plan/lose-weight" className="text-xs text-slate-500 transition-colors hover:text-blue-600">
            Browse all plans ->
          </Link>
        </div>
      </div>
    </section>
  )
}
