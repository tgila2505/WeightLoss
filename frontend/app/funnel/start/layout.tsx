import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { UtmCapture } from '@/components/utm-capture'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <UtmCapture />
      {children}
    </>
  )
}
