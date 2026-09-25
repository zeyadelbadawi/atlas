/**
 * A learner's self-service course refund (backend `course-commerce`, P13) —
 * mirrors `src/course-commerce/dto/course-order-refund.contract.ts`.
 *
 * `POST course-orders/:id/refund` is buyer-initiated and has no review gate:
 * inside `REFUND_WINDOW_DAYS` of `paidAt` a paid order is refunded in full in
 * the same transaction, the order becomes `refunded` and the enrollment's
 * access is revoked. A second request for the same order returns the existing
 * refund rather than an error. `GET course-orders/:id/refund` answers `null`
 * (not 404) when no refund exists.
 */
import type { Money } from './money.types';

/** Mirrors the backend's `REFUND_WINDOW_DAYS` — UX only; the server decides. */
export const COURSE_REFUND_WINDOW_DAYS = 30;

export type CourseOrderRefundType = 'full';
export type CourseOrderRefundStatus = 'pending' | 'succeeded' | 'failed';

export interface CourseOrderRefund {
  readonly id: string;
  readonly courseOrderId: string;
  readonly paymentId: string;
  readonly refundType: CourseOrderRefundType;
  readonly status: CourseOrderRefundStatus;
  readonly money: Money;
  readonly reason?: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly processedAt?: string;
}

/** `POST course-orders/:id/refund` request body. */
export interface RequestCourseOrderRefundPayload {
  /** One per refund ATTEMPT, reused verbatim on a retry of that attempt. */
  readonly idempotencyKey: string;
  /** Optional, at most 1000 characters server-side. */
  readonly reason?: string;
}
