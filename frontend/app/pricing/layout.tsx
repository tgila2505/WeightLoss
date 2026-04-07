import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMetadata({
  title: 'Pricing — WeightLoss App',
  description:
    'Simple, transparent pricing for personalised weight loss plans. Start free and upgrade when you\'re ready.',
  path: '/pricing',
})

export default function PricingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
