export type PaywallCapability =
  | 'meal_plan_full'
  | 'weekly_schedule'
  | 'profile_edit'
  | 'ai_plans'
  | 'coaching_insights'
  | 'goal_specific_plans'
  | 'advanced_coaching'
  | 'weekly_ai_report'

export interface PaywallMessage {
  headline: string
  subCopy: string
  requiredTier: 'pro' | 'pro_plus'
}

export const PAYWALL_MESSAGES: Record<PaywallCapability, PaywallMessage> = {
  meal_plan_full: {
    headline: 'Your meals are planned. Unlock them.',
    subCopy: 'Days 2–7 are ready. Upgrade to see your full week.',
    requiredTier: 'pro',
  },
  weekly_schedule: {
    headline: 'Your full week is ready.',
    subCopy: 'Your schedule beyond Monday is planned. Unlock the full week.',
    requiredTier: 'pro',
  },
  profile_edit: {
    headline: 'Customize your profile.',
    subCopy: 'Update your goals and preferences with a Pro plan.',
    requiredTier: 'pro',
  },
  ai_plans: {
    headline: 'AI-personalized plans await.',
    subCopy: 'Get meal plans built specifically for your biology and goals.',
    requiredTier: 'pro',
  },
  coaching_insights: {
    headline: 'Your coach has feedback.',
    subCopy: 'Based on your last 7 days, your AI coach has 3 suggestions.',
    requiredTier: 'pro',
  },
  goal_specific_plans: {
    headline: 'Built for your exact goal.',
    subCopy: 'Keto, muscle gain, PCOS protocols — personalized to your biology.',
    requiredTier: 'pro_plus',
  },
  advanced_coaching: {
    headline: 'Weekly AI check-ins.',
    subCopy: 'Your AI coach reviews your progress every week and adapts your plan.',
    requiredTier: 'pro_plus',
  },
  weekly_ai_report: {
    headline: 'Your progress report is ready.',
    subCopy: "See exactly what's working and what to adjust.",
    requiredTier: 'pro_plus',
  },
}
