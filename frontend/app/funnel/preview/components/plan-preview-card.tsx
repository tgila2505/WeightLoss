import type { FunnelPreview } from '@/lib/funnel-session';

export function PlanPreviewCard({ preview }: { preview: FunnelPreview }) {
  // Calorie density: protein=4 kcal/g, carbs=4 kcal/g, fat=9 kcal/g
  const proteinKcal = preview.protein_g * 4;
  const carbsKcal = preview.carbs_g * 4;
  const fatKcal = preview.fat_g * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal || 1; // guard divide-by-zero
  const macros = [
    { label: 'Protein', grams: preview.protein_g, pct: Math.round(proteinKcal / totalMacroKcal * 100), color: 'bg-blue-500' },
    { label: 'Carbs', grams: preview.carbs_g, pct: Math.round(carbsKcal / totalMacroKcal * 100), color: 'bg-amber-500' },
    { label: 'Fat', grams: preview.fat_g, pct: Math.round(fatKcal / totalMacroKcal * 100), color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <div className="text-center">
        <p className="mb-1 text-sm text-slate-500">Daily calorie target</p>
        <p className="text-5xl font-bold text-slate-900">{preview.calories.toLocaleString()}</p>
        <p className="mt-1 text-xs text-slate-500">
          kcal/day. {preview.deficit_rate} kcal deficit.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Macro split
        </p>
        <div className="flex h-2 gap-1 overflow-hidden rounded-full">
          {macros.map((macro) => (
            <div key={macro.label} className={macro.color} style={{ width: `${macro.pct}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {macros.map((macro) => (
            <div
              key={macro.label}
              className="rounded-2xl border border-slate-200 bg-white p-3 text-center"
            >
              <p className="text-lg font-semibold text-slate-900">{macro.grams}g</p>
              <p className="text-xs text-slate-500">{macro.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
        <p className="text-xs text-emerald-700">Estimated weekly loss</p>
        <p className="mt-1 text-xl font-bold text-emerald-700">
          ~{preview.weekly_loss_kg_estimate} kg/week
        </p>
      </div>
    </div>
  );
}
