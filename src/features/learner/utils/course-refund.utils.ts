/**
 * Refund eligibility as the purchases page PRESENTS it (backend P13).
 *
 * The server is the only authority: `CourseOrderRefundsService` refunds an
 * order only when it is `paid` and now ≤ `paidAt + REFUND_WINDOW_DAYS`, and
 * answers `errors.courseOrder.refundNotEligible` /
 * `errors.courseOrder.refundWindowElapsed` otherwise. This mirrors that rule
 * only to decide whether to OFFER the action and which hint to show; a
 * learner whose clock is wrong still gets the server's answer, in the dialog.
 */
import { COURSE_REFUND_WINDOW_DAYS } from '@types';
import type { CourseOrder } from '@types';

const DAY_MS = 24 * 60 * 60 * 1000;

export type RefundEligibility =
  | { readonly kind: 'eligible'; readonly deadline: Date }
  | { readonly kind: 'windowClosed'; readonly deadline: Date }
  | { readonly kind: 'notApplicable' };

/** The last moment a paid order may be refunded, or `null` when it was never paid. */
export function refundDeadline(
  order: Pick<CourseOrder, 'paidAt'>
): Date | null {
  if (!order.paidAt) return null;
  const paidAt = Date.parse(order.paidAt);
  if (Number.isNaN(paidAt)) return null;
  return new Date(paidAt + COURSE_REFUND_WINDOW_DAYS * DAY_MS);
}

export function refundEligibility(
  order: Pick<CourseOrder, 'status' | 'paidAt'>,
  now: number = Date.now()
): RefundEligibility {
  if (order.status !== 'paid') return { kind: 'notApplicable' };
  const deadline = refundDeadline(order);
  if (!deadline) return { kind: 'notApplicable' };
  return now > deadline.getTime()
    ? { kind: 'windowClosed', deadline }
    : { kind: 'eligible', deadline };
}
