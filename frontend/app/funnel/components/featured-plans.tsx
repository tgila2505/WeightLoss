import Link from 'next/link'
import { DIET_TYPES, GOAL_TYPES, buildPseoSlug, buildPseoTitle } from '@/lib/seo/pseo-combinations'

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
    <section className="px-4 py-10 max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-white text-center mb-2">Popular plans</h2>
      <p className="text-zinc-500 text-sm text-center mb-6">
        Explore personalised plans by goal and diet
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FEATURED.map(({ goalType, dietType }) => {
          const slug = buildPseoSlug({ goalType, dietType })
          const title = buildPseoTitle({ goalType, dietType })
          return (
            <Link
              key={slug}
              href={`/plan/${slug}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-blue-700 hover:bg-zinc-800 transition-colors"
            >
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1 capitalize">
                {dietType.replace(/-/g, ' ')}
              </p>
              <p className="text-sm text-zinc-200 group-hover:text-white leading-snug">{title}</p>
            </Link>
          )
        })}
      </div>
      <div className="text-center mt-5">
        <Link href="/plan/lose-weight" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Browse all plans →
        </Link>
      </div>
    </section>
  )
}
