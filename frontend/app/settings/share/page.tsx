'use client'

import { useEffect, useState } from 'react'
import { getAccessToken } from '@/lib/auth'

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000') + '/api/v1'

async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })

  if (res.status === 204) return undefined as unknown as T
  if (!res.ok) {
    let msg = 'Request failed.'
    try {
      const data = await res.json()
      msg = data.detail ?? data.error?.message ?? msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

interface PreviewData {
  title: string
  kg_lost: number
  weeks_taken: number
  diet_type: string | null
  preview_slug: string
}

interface ShareState {
  isPublic: boolean
  slug: string | null
  url: string | null
}

export default function ShareSettingsPage() {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [shareState, setShareState] = useState<ShareState>({ isPublic: false, slug: null, url: null })
  const [quote, setQuote] = useState('')
  const [nameVisible, setNameVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [previewRes, ugcSlugsRes] = await Promise.allSettled([
          authedFetch<PreviewData>('/seo/ugc/preview'),
          authedFetch<{ slugs: string[] }>('/seo/ugc/slugs'),
        ])
        if (previewRes.status === 'fulfilled') setPreview(previewRes.value)
        // Check if current user already has a public page by seeing if their preview slug appears
        if (
          previewRes.status === 'fulfilled' &&
          ugcSlugsRes.status === 'fulfilled'
        ) {
          const { preview_slug } = previewRes.value
          const slugs = ugcSlugsRes.value.slugs
          if (slugs.includes(preview_slug)) {
            const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://weightloss.app'
            setShareState({ isPublic: true, slug: preview_slug, url: `${base}/results/${preview_slug}` })
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleShare() {
    setSaving(true)
    setError(null)
    try {
      const res = await authedFetch<{ slug: string; url: string; is_public: boolean }>(
        '/seo/ugc/share',
        {
          method: 'POST',
          body: JSON.stringify({ display_name_visible: nameVisible, user_quote: quote || null }),
        },
      )
      setShareState({ isPublic: res.is_public, slug: res.slug, url: res.url })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to share. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnshare() {
    setSaving(true)
    setError(null)
    try {
      await authedFetch('/seo/ugc/unshare', { method: 'DELETE' })
      setShareState({ isPublic: false, slug: null, url: null })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove page.')
    } finally {
      setSaving(false)
    }
  }

  async function copyLink() {
    if (!shareState.url) return
    try {
      await navigator.clipboard.writeText(shareState.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (non-HTTPS or permissions denied) — silently ignore
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-slate-600 mb-4">
            Complete your profile and log some progress before sharing a result page.
          </p>
          <a href="/onboarding" className="text-blue-600 hover:underline text-sm">
            Go to onboarding →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Share your result</h1>
        <p className="text-slate-500 text-sm mb-8">
          Create a public page celebrating your weight loss journey. It can inspire others — and it helps people find us.
        </p>

        {/* Preview card */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl px-6 py-8 text-white mb-8">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3">Preview</p>
          <h2 className="text-xl font-bold mb-4 leading-snug">{preview.title}</h2>
          <div className="flex gap-4">
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{Math.round(preview.kg_lost)}</div>
              <div className="text-blue-200 text-xs">kg lost</div>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{preview.weeks_taken}</div>
              <div className="text-blue-200 text-xs">weeks</div>
            </div>
            {preview.diet_type && (
              <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
                <div className="text-base font-semibold capitalize">{preview.diet_type.replace(/-/g, ' ')}</div>
                <div className="text-blue-200 text-xs">diet</div>
              </div>
            )}
          </div>
        </section>

        {/* Options */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 space-y-5">
          {/* Name visibility toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Show my name</p>
              <p className="text-xs text-slate-400 mt-0.5">
                If off, your page will use &ldquo;a user&rdquo; instead of your name.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={nameVisible}
              onClick={() => setNameVisible((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                nameVisible ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  nameVisible ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Quote */}
          <div>
            <label htmlFor="quote" className="block text-sm font-medium text-slate-800 mb-1.5">
              Your quote <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="quote"
              rows={3}
              maxLength={280}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder='e.g. "Knowing my exact calorie target changed everything."'
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{quote.length}/280</p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Active share link */}
        {shareState.isPublic && shareState.url && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6">
            <span className="text-emerald-700 text-xs font-medium truncate flex-1">{shareState.url}</span>
            <button
              type="button"
              onClick={copyLink}
              className="flex-shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={shareState.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              View →
            </a>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : shareState.isPublic ? 'Update page' : 'Make public'}
          </button>
          {shareState.isPublic && (
            <button
              type="button"
              onClick={handleUnshare}
              disabled={saving}
              className="px-5 py-3 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
