'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { setUXPreference, getUXPreference, type UXVariant } from '@/lib/ux-mode'
import { trackEvent } from '@/lib/analytics'

interface UXModeSwitcherProps {
  currentMode: UXVariant
  userId?: number
}

export function UXModeSwitcher({ currentMode, userId }: UXModeSwitcherProps) {
  const router = useRouter()
  const [preference, setLocalPreference] = useState<UXVariant | null>(null)

  useEffect(() => {
    setLocalPreference(getUXPreference())
  }, [])

  function switchTo(mode: UXVariant) {
    setUXPreference(mode)
    setLocalPreference(mode)
    trackEvent('ux_mode_preference_set', {
      userId,
      uxMode: currentMode,
      newMode: mode,
    })
    router.push(mode === 'wizard' ? '/wizard' : '/mindmap')
  }

  const targetMode: UXVariant = currentMode === 'wizard' ? 'mindmap' : 'wizard'
  const targetLabel = targetMode === 'wizard' ? 'Guided Wizard' : 'Mind Map Explorer'

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Prefer a different format?</span>
      <Button
        variant="link"
        className="h-auto p-0 text-sm"
        onClick={() => switchTo(targetMode)}
      >
        Switch to {targetLabel}
      </Button>
      {preference && preference !== currentMode && (
        <span className="text-xs opacity-60">(saved preference: {preference})</span>
      )}
    </div>
  )
}
