'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { setUXPreference, type UXVariant } from '@/lib/ux-mode'
import { trackEvent } from '@/lib/analytics'

interface UXModeSwitcherProps {
  currentMode: UXVariant
  userId?: number
  /** Wizard-only: current step id, included in analytics */
  stepId?: string
  /** Wizard-only: current step index, included in analytics */
  stepIndex?: number
  /**
   * Called before navigation. Use this to flush unsaved data (e.g. wizard partial answers).
   * If it throws, the switch is aborted.
   */
  onBeforeSwitch?: () => Promise<void>
  /** 'inline' renders as a subtle text link; 'floating' renders as a fixed bottom-right button */
  variant?: 'inline' | 'floating' | 'segmented'
}

export function UXModeSwitcher({
  currentMode,
  userId,
  stepId,
  stepIndex,
  onBeforeSwitch,
  variant = 'inline',
}: UXModeSwitcherProps) {
  const router = useRouter()
  const [isSwitching, setIsSwitching] = useState(false)

  async function switchTo(mode: UXVariant) {
    if (isSwitching) return
    setIsSwitching(true)
    try {
      if (onBeforeSwitch) {
        await onBeforeSwitch()
      }
      setUXPreference(mode)
      trackEvent('ux_mode_switched', {
        userId,
        uxMode: currentMode,
        toMode: mode,
        ...(stepId != null ? { stepId, stepIndex } : {}),
      })
      router.push(mode === 'wizard' ? '/wizard' : '/mindmap')
    } catch (err) {
      console.error('Failed to switch UX mode:', err)
      setIsSwitching(false)
    }
  }

  const targetMode: UXVariant = currentMode === 'wizard' ? 'mindmap' : 'wizard'
  const targetLabel = targetMode === 'wizard' ? 'Guided Wizard' : 'Mind Map Explorer'
  const label = isSwitching ? 'Switching…' : `Switch to ${targetLabel}`

  if (variant === 'segmented') {
    return (
      <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => currentMode !== 'wizard' && switchTo('wizard')}
          disabled={currentMode === 'wizard' || isSwitching}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            currentMode === 'wizard'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Wizard
        </button>
        <button
          type="button"
          onClick={() => currentMode !== 'mindmap' && switchTo('mindmap')}
          disabled={currentMode === 'mindmap' || isSwitching}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            currentMode === 'mindmap'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Mind Map
        </button>
      </div>
    )
  }

  if (variant === 'floating') {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          variant="outline"
          size="sm"
          className="shadow-md bg-background text-xs"
          onClick={() => switchTo(targetMode)}
          disabled={isSwitching}
        >
          {label}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <span>Prefer a different format?</span>
      <Button
        variant="link"
        className="h-auto p-0 text-sm"
        onClick={() => switchTo(targetMode)}
        disabled={isSwitching}
      >
        {label}
      </Button>
    </div>
  )
}
