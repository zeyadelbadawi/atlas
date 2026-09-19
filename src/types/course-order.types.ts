/**
 * A learner's own course purchase (backend `course-commerce`, P13).
 *
 * Mirrors `src/course-commerce/dto/course-order.contract.ts`. The
 * `snapshot` is the point of the shape: a receipt has to keep showing the
 * title and the price that were agreed at the time, which is why the
 * order carries its own copy rather than joining the live course row —
 * a course renamed or repriced next month must not rewrite last month's
 * receipt.
 *
 * `GET /course-orders` returns the caller's orders across EVERY academy
 * (it is RLS-scoped to the student, not to a host). The learner surface
 * is academy-scoped by construction, so `/my/purchases` filters on
 * `academyId` before rendering — see that page for why that filter is a
 * tenancy requirement and not a convenience.
 */
import type { Money } from './money.types';

export const COURSE_ORDER_STATUSES = [
  'draft',
  'pending_payment',
  'paid',
  'expired',
  'cancelled',
  'refunded',
] as const;
export type CourseOrderStatus = (typeof COURSE_ORDER_STATUSES)[number];

export interface CourseOrderSnapshot {
  readonly course: { readonly id: string; readonly title: string };
  readonly price: Money;
  readonly capturedAt: string;
}

export interface CourseOrder {
  readonly id: string;
  readonly studentId: string;
  readonly courseId: string;
  readonly academyId: string;
  readonly organizationId: string;
  readonly snapshot: CourseOrderSnapshot;
  readonly status: CourseOrderStatus;
  readonly expiresAt: string;
  readonly idempotencyKey: string;
  readonly paidAt?: string;
  readonly createdAt: string;
}
