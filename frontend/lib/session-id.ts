/** Returns a stable session ID for this browser tab, consistent with analytics.ts */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const key = '_analytics_sid';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}
