/**
 * Academy payout status → badge tone. Same tone-mapping pattern as
 * `features/billing/utils/payment-status.utils.ts`.
 */
import type { StatusTone } from '@components/data-display';
import type { AcademyPayoutStatus } from '@types';

export function getAcademyPayoutStatusTone(
  status: AcademyPayoutStatus
): StatusTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'processing':
      return 'info';
    case 'failed':
      return 'destructive';
    default:
      return 'neutral';
  }
}

/** Only a payout the backend will actually move to `paid`: `failed` is a 409 and `paid` is a no-op. */
export function canMarkPayoutPaid(status: AcademyPayoutStatus): boolean {
  return status === 'pending' || status === 'processing';
}
