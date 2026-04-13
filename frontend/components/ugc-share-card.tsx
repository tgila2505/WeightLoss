'use client'

import { useState } from 'react'
import { buildShareUrl } from '@/lib/utm'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

type State = 'idle' | 'loading' | 'shared' | 'error'

export function UgcShareCard() {
  const [state, setState] = useState<State>('idle')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    setState('loading')
    try {
      const res = await fetch(`${API_BASE}/seo/ugc/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' as RequestCredentials,
        body: JSON.stringify({ display_name_visible: true }),
      })
      if (!res.ok) throw new Error('Share failed')
      const data = (await res.json()) as { slug: string; url: string; is_public: boolean }
      setShareUrl(buildShareUrl(data.slug))
      setState('shared')
    } catch {
      setState('error')
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Share your results</h3>
      <p className="text-xs text-slate-500 mb-4">
        Inspire others and get a public page for your weight loss journey.
      </p>

      {state === 'idle' && (
        <button
          onClick={handleShare}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          Create my results page
        </button>
      )}

      {state === 'loading' && (
        <button
          disabled
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-200 text-white cursor-not-allowed"
        >
          Creating...
        </button>
      )}

      {state === 'shared' && shareUrl && (
        <div className="space-y-2">
          <p className="text-xs text-green-600 font-medium">Your page is live!</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600 truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <p className="text-xs text-red-600">
          Could not create your page. Make sure you&apos;ve completed onboarding first.
        </p>
      )}
    </div>
  )
}
