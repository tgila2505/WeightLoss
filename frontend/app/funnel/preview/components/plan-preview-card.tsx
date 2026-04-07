import type { FunnelPreview } from '@/lib/funnel-session'

export function PlanPreviewCard({ preview }: { preview: FunnelPreview }) {
  const macros = [
    { label: 'Protein', grams: preview.protein_g, pct: 30, color: 'bg-blue-500' },
    { label: 'Carbs', grams: preview.carbs_g, pct: 40, color: 'bg-amber-500' },
    { label: 'Fat', grams: preview.fat_g, pct: 30, color: 'bg-rose-500' },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
      <div className="text-center">
        <p className="text-zinc-400 text-sm mb-1">Daily calorie target</p>
        <p className="text-5xl font-bold text-white">{preview.calories.toLocaleString()}</p>
        <p className="text-zinc-500 text-xs mt-1">kcal/day · {preview.deficit_rate} kcal deficit</p>
      </div>

      <div className="space-y-3">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Macro split</p>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden">
          {macros.map((m) => (
            <div key={m.label} className={`${m.color}`} style={{ width: `${m.pct}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {macros.map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-white font-semibold text-lg">{m.grams}g</p>
              <p className="text-zinc-500 text-xs">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-800 rounded-xl p-4 text-center">
        <p className="text-zinc-400 text-xs">Estimated weekly loss</p>
        <p className="text-emerald-400 font-bold text-xl mt-1">
          ~{preview.weekly_loss_kg_estimate} kg/week
        </p>
      </div>
    </div>
  )
}
