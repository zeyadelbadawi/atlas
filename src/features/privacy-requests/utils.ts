import type { StatusTone } from '@components/data-display';
import type { PrivacyRequestStatus } from './types';

/** One tone per status, shared by the learner card and the Platform Owner queue. */
export function privacyStatusTone(status: PrivacyRequestStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'rejected':
      return 'destructive';
    case 'in_progress':
      return 'info';
    default:
      return 'neutral';
  }
}
