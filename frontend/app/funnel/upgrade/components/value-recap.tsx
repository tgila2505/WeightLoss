import { TestimonialCard } from '../../components/social-proof/testimonial-card'

const UNLOCK_ITEMS = [
  '7-day personalised meal plan',
  'Weekly workout schedule',
  'AI coaching insights',
  'Unlimited plan regeneration',
]

export function ValueRecap({ name }: { name?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          {name ? `Unlock ${name}'s full plan` : 'Unlock your full plan'}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">meals, schedule, and weekly coaching</p>
      </div>

      <ul className="space-y-2">
        {UNLOCK_ITEMS.map((item) => (
          <li key={item} className="flex items-center gap-3 text-zinc-300 text-sm">
            <span className="text-emerald-400">✓</span>
            {item}
          </li>
        ))}
      </ul>

      <TestimonialCard
        name="James T."
        result="Down 12kg in 14 weeks"
        quote="The macro split was the missing piece. I wasn't eating enough protein."
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-white font-semibold text-lg">$9 / month</p>
        <p className="text-zinc-500 text-xs mt-1">Cancel anytime · 7-day free trial included</p>
      </div>
    </div>
  )
}
