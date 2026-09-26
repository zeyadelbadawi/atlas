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
import type {
  ManualReviewStatus,
  PaymentAttempt,
  PaymentLifecycleStatus,
  PaymentMethodType,
  PaymentNextAction,
  PaymentProof,
} from './payment.types';

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

/** `POST courses/:id/course-orders` request (P13). */
export interface CreateCourseOrderPayload {
  readonly idempotencyKey: string;
}

/** `POST course-orders/:id/payments` request — the buyer picks a method key. */
export interface CreateCourseOrderPaymentPayload {
  readonly methodKey: string;
}

/**
 * A Payment against a course order (backend `course-order-payment.contract`).
 * The buyer/seller analog of `Payment`: it carries `payerUserId`/
 * `payeeAcademyId` and no organization/checkout id, and reuses the shared
 * proof/attempt/review shapes.
 */
export interface CourseOrderPayment {
  readonly id: string;
  readonly courseOrderId: string;
  readonly payerUserId: string;
  readonly payeeAcademyId: string;
  readonly methodKey: string;
  readonly methodType: PaymentMethodType;
  readonly provider: string;
  readonly money: Money;
  readonly status: PaymentLifecycleStatus;
  readonly reviewStatus: ManualReviewStatus;
  readonly proof?: PaymentProof;
  readonly attempts: readonly PaymentAttempt[];
  readonly failureReason?: string;
  readonly reviewNotes?: string;
  readonly nextAction?: PaymentNextAction;
  /** §4.1 snapshot — the payment-collection mode in force when this Payment was created. Never recomputed. */
  readonly paymentCollectionModeSnapshot?:
    'unconfigured' | 'atlas_payments' | 'organization_gateway';
  /** §4.2 snapshot — absent under Organization-Owned Gateway mode (no Atlas commission applies there). */
  readonly commission?: {
    readonly rateBasisPoints: number;
    readonly amountMinorUnits: number;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
}
