'use client'

import { useHasCapability } from '@/lib/subscription-context'
import { LockOverlay } from '@/components/paywall/lock-overlay'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const PROTOCOLS = [
  { id: 'keto', label: 'Ketogenic', description: 'Carbs < 5% · Fat > 65% · Filtered food list' },
  {
    id: 'muscle_gain',
    label: 'Muscle Gain',
    description: '+300 kcal surplus · Protein > 35% · Resistance training prompts',
  },
  {
    id: 'pcos',
    label: 'PCOS Protocol',
    description: 'Anti-inflammatory · Lower GI · Cycle-phase notes',
  },
  {
    id: 'menopause',
    label: 'Menopause Protocol',
    description: 'Higher calcium/D · Strength training emphasis',
  },
  {
    id: 'if',
    label: 'Intermittent Fasting',
    description: 'Eating window config (16:8, 18:6) · Meal timing adjusted',
  },
]

function ProtocolContent() {
  return (
    <div className="flex flex-col gap-4">
      {PROTOCOLS.map((p) => (
        <Card key={p.id} className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{p.label}</CardTitle>
            <CardDescription>{p.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">
              Select protocol
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function ProtocolPage() {
  const hasAccess = useHasCapability('goal_specific_plans')

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-6">Goal Protocol</h1>
      {hasAccess ? (
        <ProtocolContent />
      ) : (
        <LockOverlay capability="goal_specific_plans">
          <ProtocolContent />
        </LockOverlay>
      )}
    </div>
  )
}
