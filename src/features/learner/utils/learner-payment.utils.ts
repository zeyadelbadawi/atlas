/**
 * Academy Manual Payments — where one of the learner's payments stands, in
 * the learner's words (the "My payments" page). Derived from the server's
 * lifecycle and review state; never decided by the client.
 */
import type { LearnerCoursePayment } from '@types';

export type LearnerPaymentDisplayState =
  'awaitingProof' | 'underReview' | 'approved' | 'rejected' | 'closed';

export function learnerPaymentState(
  payment: Pick<
    LearnerCoursePayment,
    'status' | 'reviewStatus' | 'awaitingProof'
  >
): LearnerPaymentDisplayState {
  if (payment.reviewStatus === 'approved' || payment.status === 'succeeded') {
    return 'approved';
  }
  if (payment.reviewStatus === 'rejected') return 'rejected';
  if (payment.reviewStatus === 'pending') return 'underReview';
  if (payment.awaitingProof) return 'awaitingProof';
  return 'closed';
}

/**
 * B7 (UX audit, V12) — the short reference of an order or payment: the same
 * first eight characters the academy's Orders list shows, so a learner and
 * the academy can name the same order.
 */
export function shortReference(id: string): string {
  return id.slice(0, 8);
}
