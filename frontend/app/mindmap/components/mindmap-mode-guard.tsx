'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchProfile } from '@/lib/api-client'
import { resolveUXMode } from '@/lib/ux-mode'
import { UXModeSwitcher } from '@/components/ux-mode-switcher'

export function MindMapModeGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allowed, setAllowed] = useState(false)
  const [userId, setUserId] = useState<number | undefined>(undefined)

  useEffect(() => {
    async function check() {
      const profile = await fetchProfile()
      const id = profile?.user_id ?? undefined
      setUserId(id)
      const urlOverride = searchParams.get('ux')
      const resolution = resolveUXMode(id ?? null, urlOverride)
      if (resolution.mode === 'wizard') {
        router.replace('/wizard')
      } else {
        setAllowed(true)
      }
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!allowed) return null
  return (
    <>
      {children}
      <UXModeSwitcher currentMode="mindmap" userId={userId} variant="floating" />
    </>
  )
}
