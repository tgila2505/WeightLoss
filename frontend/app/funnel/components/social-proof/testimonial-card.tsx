interface TestimonialCardProps {
  name: string;
  result: string;
  quote: string;
}

export function TestimonialCard({ name, result, quote }: TestimonialCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        {result}
      </span>
      <p className="text-sm leading-relaxed text-slate-600">&ldquo;{quote}&rdquo;</p>
      <p className="text-xs font-medium text-slate-500">- {name}</p>
    </div>
  );
}
