interface TransformationCardProps {
  startWeight: string;
  currentWeight: string;
  weeks: number;
}

export function TransformationCard({ startWeight, currentWeight, weeks }: TransformationCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-center">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Started</p>
        <p className="text-xl font-bold text-slate-900">{startWeight}</p>
      </div>
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="relative h-px w-full bg-slate-300">
          <span className="absolute left-1/2 -top-3 -translate-x-1/2 text-xs text-slate-500">
            {weeks} weeks
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Now</p>
        <p className="text-xl font-bold text-emerald-600">{currentWeight}</p>
      </div>
    </div>
  );
}
