'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchProfile } from '@/lib/api-client'
import { resolveUXMode } from '@/lib/ux-mode'

export function MindMapModeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    async function check() {
      const profile = await fetchProfile()
      const urlOverride = searchParams.get('ux')
      const resolution = resolveUXMode(profile?.user_id ?? null, urlOverride)
      if (resolution.mode === 'wizard') {
        router.replace('/wizard')
      } else {
        setAllowed(true)
      }
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!allowed) return null
  return <>{children}</>
}
