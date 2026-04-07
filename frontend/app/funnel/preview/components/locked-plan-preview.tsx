import Link from 'next/link'
import { Button } from '@/components/ui/button'

const LOCKED_ITEMS = ['7-day meal plan', 'Weekly workout schedule', 'AI coaching insights']

export function LockedPlanPreview() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Pro features</p>
      <div className="space-y-3">
        {LOCKED_ITEMS.map((item) => (
          <div key={item} className="flex items-center gap-3 relative">
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs">🔒</span>
            </div>
            <div className="blur-sm select-none flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400">
              {item}
            </div>
          </div>
        ))}
      </div>
      <Button asChild className="w-full mt-2">
        <Link href="/funnel/upgrade">Unlock your full plan →</Link>
      </Button>
      <p className="text-center text-zinc-600 text-xs">7-day free trial · $9/mo after · Cancel anytime</p>
    </div>
  )
}
