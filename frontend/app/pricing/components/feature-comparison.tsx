'use client'

import { useState } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'

const FEATURES = [
  { label: 'Calorie + macro calculator', free: true, pro: true, pro_plus: true },
  { label: 'Full 7-day meal plan', free: false, pro: true, pro_plus: true },
  { label: 'Weekly schedule', free: false, pro: true, pro_plus: true },
  { label: 'Profile & settings edit', free: false, pro: true, pro_plus: true },
  { label: 'AI-generated plans', free: false, pro: true, pro_plus: true },
  { label: 'Coaching insights', free: false, pro: true, pro_plus: true },
  { label: 'Goal-specific protocols', free: false, pro: false, pro_plus: true },
  { label: 'Advanced weekly coaching', free: false, pro: false, pro_plus: true },
  { label: 'Weekly AI progress report', free: false, pro: false, pro_plus: true },
  { label: 'Priority support', free: false, pro: false, pro_plus: true },
]

function Cell({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-4 w-4 text-primary mx-auto" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
  )
}

export function FeatureComparison() {
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full max-w-3xl mx-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        See full comparison
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Feature</th>
                <th className="text-center py-2 px-4 font-medium">Free</th>
                <th className="text-center py-2 px-4 font-medium">Pro</th>
                <th className="text-center py-2 px-4 font-medium">Pro+</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label} className="border-b last:border-0">
                  <td className="py-2 pr-4">{f.label}</td>
                  <td className="py-2 px-4"><Cell value={f.free} /></td>
                  <td className="py-2 px-4"><Cell value={f.pro} /></td>
                  <td className="py-2 px-4"><Cell value={f.pro_plus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
