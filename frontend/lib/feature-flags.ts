export interface FeatureFlags {
  wizardEnabled: boolean
  mindmapEnabled: boolean
  abTestingEnabled: boolean
  wizardRolloutPct: number // 0–100; percentage of users bucketed into wizard
}

export function getFeatureFlags(): FeatureFlags {
  return {
    wizardEnabled: process.env.NEXT_PUBLIC_WIZARD_ENABLED === 'true',
    mindmapEnabled: process.env.NEXT_PUBLIC_MINDMAP_ENABLED !== 'false',
    abTestingEnabled: process.env.NEXT_PUBLIC_AB_TESTING_ENABLED === 'true',
    wizardRolloutPct: parseInt(process.env.NEXT_PUBLIC_WIZARD_ROLLOUT_PCT ?? '0', 10),
  }
}
