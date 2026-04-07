'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode, Suspense, useEffect } from 'react'
import { captureEvent, initPostHog } from '@/lib/posthog'

/**
 * Inner component — needs Suspense because useSearchParams suspends during SSR.
 */
function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    captureEvent('$pageview', {
      $current_url: window.location.href,
      pathname,
    })
  }, [pathname, searchParams])

  return null
}

/**
 * Wrap the app with this provider to enable PostHog tracking.
 * Place it near the root in layout.tsx (client-side only).
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  )
}
