/**
 * Tenant subscription status → tone mapping.
 *
 * Same tone-mapping pattern already used for Academy/Course/Learning status.
 */
import type { StatusTone } from '@components/data-display';
import type { TenantSubscriptionStatus } from '@types';

export function getSubscriptionStatusTone(
  status: TenantSubscriptionStatus
): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'grace_period':
      return 'warning';
    case 'past_due':
      return 'warning';
    case 'paused':
      return 'neutral';
    case 'cancelled':
    case 'expired':
      return 'destructive';
    default:
      return 'neutral';
  }
}
