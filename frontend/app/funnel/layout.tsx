import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { buildMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMetadata({
  title: 'Free Weight Loss Calorie Calculator — WeightLoss App',
  description:
    'Get your personalised daily calorie target in 60 seconds. Science-based TDEE calculator with meal plans for fat loss, muscle gain, and maintenance.',
  path: '/funnel',
})

export default function FunnelLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
