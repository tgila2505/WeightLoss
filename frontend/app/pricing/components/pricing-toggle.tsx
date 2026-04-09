'use client'

interface PricingToggleProps {
  interval: 'monthly' | 'annual'
  onChange: (v: 'monthly' | 'annual') => void
}

export function PricingToggle({ interval, onChange }: PricingToggleProps) {
  return (
    <div className="flex items-center gap-3 justify-center">
      <button
        onClick={() => onChange('monthly')}
        className={`text-sm font-medium transition-colors ${
          interval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        Monthly
      </button>
      <div
        className="relative w-12 h-6 rounded-full bg-primary cursor-pointer"
        onClick={() => onChange(interval === 'annual' ? 'monthly' : 'annual')}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
            interval === 'annual' ? 'left-7' : 'left-1'
          }`}
        />
      </div>
      <button
        onClick={() => onChange('annual')}
        className={`text-sm font-medium transition-colors ${
          interval === 'annual' ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        Annual
        <span className="ml-1 text-xs text-emerald-500 font-semibold">Save up to 57%</span>
      </button>
    </div>
  )
}
