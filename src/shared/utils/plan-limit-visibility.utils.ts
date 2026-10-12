/**
 * B0-MED-04 — a plan limit a customer cannot use yet is never shown to
 * customers: video storage until hosted video can be authored, recorded
 * sessions (the video-minutes allowance) while Live Sessions is unlaunched.
 * The catalog keeps the stored values; the Platform Owner editor shows all.
 */
import { isFeatureEnabled } from '@/config/feature-flags.config';
import type { PlanLimitKey } from '@types';

export function isCustomerVisibleLimitKey(key: PlanLimitKey): boolean {
  if (key === 'videoStorage') return isFeatureEnabled('hostedVideoAuthoring');
  if (key === 'recordedSessions') return isFeatureEnabled('liveSessions');
  return true;
}
