/**
 * Payment status / review status → tone mapping.
 *
 * Same tone-mapping pattern already used for Tenant subscription status
 * (Prompt 6), Academy/Course/Learning status.
 */
import type { StatusTone } from '@components/data-display';
import type { ManualReviewStatus, PaymentLifecycleStatus } from '@types';

export function getPaymentStatusTone(status: PaymentLifecycleStatus): StatusTone {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'created':
    case 'pending':
      return 'neutral';
    case 'processing':
    case 'requires_action':
    case 'requires_confirmation':
      return 'info';
    case 'failed':
      return 'destructive';
    case 'cancelled':
    case 'expired':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getManualReviewStatusTone(status: ManualReviewStatus): StatusTone {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'destructive';
    case 'pending':
      return 'warning';
    case 'not_required':
    default:
      return 'neutral';
  }
}
