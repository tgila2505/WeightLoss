export type UXVariant = 'wizard' | 'mindmap'

/**
 * djb2 hash adapted for numeric user IDs.
 * Returns a stable bucket 0–99 for a given userId.
 */
function userBucket(userId: number): number {
  let hash = 5381
  const str = String(userId)
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash | 0 // keep 32-bit integer
  }
  return Math.abs(hash) % 100
}

/**
 * Returns the UX variant for a user given a rollout percentage.
 * Assignment is sticky — same userId always maps to same variant.
 */
export function getABVariant(userId: number, rolloutPct: number): UXVariant {
  return userBucket(userId) < rolloutPct ? 'wizard' : 'mindmap'
}
