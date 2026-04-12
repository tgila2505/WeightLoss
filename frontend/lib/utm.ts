const UTM_STORAGE_KEY = '_utm'

export interface UtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

/** Read UTM params from the current URL and persist to sessionStorage. Call on page load. */
export function captureUtm(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const utm: UtmParams = {}
  for (const key of UTM_KEYS) {
    const val = params.get(key)
    if (val) utm[key] = val
  }
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm))
  }
}

/** Return previously captured UTM params, or empty object if none. */
export function readUtm(): UtmParams {
  if (typeof window === 'undefined') return {}
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as UtmParams) : {}
  } catch {
    return {}
  }
}

/** Build a share URL for a UGC result page with UTM attribution. */
export function buildShareUrl(slug: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://weightloss.app'
  return `${base}/results/${slug}?utm_source=ugc&utm_medium=share&utm_campaign=${slug}`
}
