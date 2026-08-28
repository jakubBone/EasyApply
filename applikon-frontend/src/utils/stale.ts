import type { Application } from '../types/domain'

// An application sitting in SENT longer than this is almost certainly dead.
export const STALE_THRESHOLD_DAYS = 60

// Whole/fractional days elapsed since an ISO date string.
export function daysSince(dateString: string): number {
  const ms = Date.now() - new Date(dateString).getTime()
  return ms / (1000 * 60 * 60 * 24)
}

// Stale = still in SENT and more than 60 days since it was applied (created).
// Exactly 60 days is NOT stale; strictly more than 60 is.
export function isStale(app: Application): boolean {
  return app.status === 'SENT' && daysSince(app.appliedAt) > STALE_THRESHOLD_DAYS
}

// Payload for the one-click archive of a stale application.
export const ARCHIVE_STALE_PAYLOAD = {
  status: 'REJECTED',
  rejectionReason: 'NO_RESPONSE',
} as const
