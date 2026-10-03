/**
 * Academy Orders — an Organization Owner's read-only view of one academy's
 * course sales. Mirrors `src/course-commerce/dto/academy-course-order.contract.ts`
 * and `academy-course-order-query.dto.ts` (backend).
 *
 * `GET academies/:id/course-orders[/:orderId]` is Organization-Owner-only
 * server-side (`assertCanViewAcademyFinance`, the same rule as the academy's
 * revenue and payouts): a manager or instructor gets 403.
 *
 * Deliberately narrow: the backend never sends the buyer's idempotency key,
 * the payment instructions, proofs, the Atlas commission or the student's
 * full email — a name and a masked email (`s•••@example.com`) only.
 */
import type { Money } from './money.types';
import type { CourseOrderStatus } from './course-order.types';
import type { CourseOrderRefundStatus } from './course-order-refund.types';
import type {
  ManualReviewStatus,
  PaymentLifecycleStatus,
  PaymentMethodType,
} from './payment.types';

export interface AcademyCourseOrderPaymentSummary {
  readonly id: string;
  readonly status: PaymentLifecycleStatus;
  readonly reviewStatus: ManualReviewStatus;
  readonly methodType: PaymentMethodType;
  readonly providerReference?: string;
  readonly money: Money;
  readonly createdAt: string;
}

export interface AcademyCourseOrderRefundSummary {
  readonly status: CourseOrderRefundStatus;
  readonly money: Money;
  readonly requestedAt: string;
  readonly processedAt?: string;
}

export interface AcademyCourseOrder {
  readonly id: string;
  readonly status: CourseOrderStatus;
  /** The price frozen on the order at purchase time. */
  readonly money: Money;
  readonly course: { readonly id: string; readonly title: string };
  readonly student: { readonly name: string; readonly maskedEmail: string };
  readonly latestPayment?: AcademyCourseOrderPaymentSummary;
  readonly paymentCount: number;
  readonly refund?: AcademyCourseOrderRefundSummary;
  readonly createdAt: string;
  readonly paidAt?: string;
  readonly expiresAt: string;
}

export interface AcademyCourseOrderDetail extends AcademyCourseOrder {
  /** Every payment attempt, newest first. */
  readonly payments: readonly AcademyCourseOrderPaymentSummary[];
}

/** `refundStatus` filter values — `none` means no refund was ever requested. */
export type AcademyCourseOrderRefundFilter = 'none' | CourseOrderRefundStatus;

/** The backend's `sortBy` allow-list. */
export const ACADEMY_COURSE_ORDER_SORT_FIELDS = [
  'createdAt',
  'paidAt',
  'amount',
] as const;
export type AcademyCourseOrderSortField =
  (typeof ACADEMY_COURSE_ORDER_SORT_FIELDS)[number];

/** The list query: the shared collection query narrowed to these filters. */
export interface AcademyCourseOrderListQuery {
  readonly pagination?: { readonly page: number; readonly pageSize: number };
  readonly sort?: {
    readonly field: AcademyCourseOrderSortField;
    readonly direction: 'asc' | 'desc';
  };
  readonly search?: string;
  readonly filters?: AcademyCourseOrderFilters;
}

/** Server-side filters (each optional, flat query params). Dates are `YYYY-MM-DD`, inclusive, UTC. */
export interface AcademyCourseOrderFilters {
  readonly status?: CourseOrderStatus;
  readonly paymentStatus?: PaymentLifecycleStatus;
  readonly reviewStatus?: ManualReviewStatus;
  readonly methodType?: PaymentMethodType;
  readonly refundStatus?: AcademyCourseOrderRefundFilter;
  readonly courseId?: string;
  readonly from?: string;
  readonly to?: string;
}
