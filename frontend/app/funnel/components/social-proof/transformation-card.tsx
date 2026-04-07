interface TransformationCardProps {
  startWeight: string
  currentWeight: string
  weeks: number
}

export function TransformationCard({ startWeight, currentWeight, weeks }: TransformationCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
      <div className="text-center">
        <p className="text-zinc-500 text-xs mb-1">Started</p>
        <p className="text-white font-bold text-xl">{startWeight}</p>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full h-px bg-zinc-700 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 text-xs text-zinc-500">
            {weeks} weeks
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-zinc-500 text-xs mb-1">Now</p>
        <p className="text-emerald-400 font-bold text-xl">{currentWeight}</p>
      </div>
    </div>
  )
}
