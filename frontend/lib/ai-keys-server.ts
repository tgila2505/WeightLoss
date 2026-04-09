/**
 * Server-side helper for Next.js API routes to fetch current AI keys from the backend.
 *
 * Keys are stored in the database (managed via the admin console) and returned here
 * via a service-to-service call authenticated with INTERNAL_SERVICE_SECRET.
 *
 * Results are cached in-process for 60 seconds to minimise DB round-trips.
 */

interface KeyCache {
  groq: string;
  mistral: string;
  fetchedAt: number;
}

let _cache: KeyCache | null = null;
const CACHE_TTL_MS = 60_000;

export async function getAiKeysFromBackend(): Promise<{ groq: string; mistral: string }> {
  const now = Date.now();

  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return { groq: _cache.groq, mistral: _cache.mistral };
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
  const secret = process.env.INTERNAL_SERVICE_SECRET ?? '';

  try {
    const res = await fetch(`${backendUrl}/api/v1/internal/ai-keys`, {
      headers: { 'x-internal-secret': secret },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json() as { groq_api_key: string; mistral_api_key: string };
      _cache = { groq: data.groq_api_key ?? '', mistral: data.mistral_api_key ?? '', fetchedAt: now };
      return { groq: _cache.groq, mistral: _cache.mistral };
    }
  } catch {
    // Fall through to env-var fallback
  }

  // Fallback to process.env (set at startup from .env.local)
  const groq = process.env.GROQ_API_KEY ?? '';
  const mistral = process.env.MISTRAL_API_KEY ?? '';
  _cache = { groq, mistral, fetchedAt: now };
  return { groq, mistral };
}

/** Invalidate the cache — call after the admin saves new keys. */
export function invalidateAiKeyCache(): void {
  _cache = null;
}
