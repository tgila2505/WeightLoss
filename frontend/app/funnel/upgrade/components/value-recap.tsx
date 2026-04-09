import { TestimonialCard } from '../../components/social-proof/testimonial-card';

const UNLOCK_ITEMS = [
  '7-day personalised meal plan',
  'Weekly workout schedule',
  'AI coaching insights',
  'Unlimited plan regeneration'
];

export function ValueRecap({ name }: { name?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          {name ? `Unlock ${name}'s full plan` : 'Unlock your full plan'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Meals, schedule, and weekly coaching in one flow.
        </p>
      </div>

      <ul className="space-y-2">
        {UNLOCK_ITEMS.map((item) => (
          <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
            <span className="text-emerald-600">+</span>
            {item}
          </li>
        ))}
      </ul>

      <TestimonialCard
        name="James T."
        result="Down 12kg in 14 weeks"
        quote="The macro split was the missing piece. I wasn't eating enough protein."
      />

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-lg font-semibold text-slate-900">$9 / month</p>
        <p className="mt-1 text-xs text-slate-500">
          Cancel anytime. 7-day free trial included.
        </p>
      </div>
    </div>
  );
}
