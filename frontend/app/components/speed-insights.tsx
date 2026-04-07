/**
 * Speed Insights wrapper — renders after `npm install` adds @vercel/speed-insights.
 * Package is declared in package.json; run `npm install` to activate.
 */
let SpeedInsightsComponent: (() => null) | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@vercel/speed-insights/next') as { SpeedInsights: () => null }
  SpeedInsightsComponent = mod.SpeedInsights
} catch {
  // Package not yet installed — no-op
}

export function SpeedInsights() {
  if (!SpeedInsightsComponent) return null
  return <SpeedInsightsComponent />
}
