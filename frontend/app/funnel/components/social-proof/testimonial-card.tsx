interface TestimonialCardProps {
  name: string
  result: string
  quote: string
}

export function TestimonialCard({ name, result, quote }: TestimonialCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
      <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 rounded-full px-3 py-1 self-start">
        {result}
      </span>
      <p className="text-zinc-300 text-sm leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <p className="text-zinc-500 text-xs font-medium">— {name}</p>
    </div>
  )
}
