/**
 * A learner's own course purchases — `course-orders` (backend P13).
 *
 * NOT `features/billing`. That feature is the TENANT's billing: an
 * organization's subscription, its invoices and its payments, every route
 * nested under `organizations/:id/...` and reachable only by a management
 * member. This is the other side of the product entirely — a student's
 * receipts for courses they bought — and the two have no endpoint, no
 * guard and no page in common. Putting a learner read into the tenant
 * billing service would be the first step toward a learner page calling
 * an organization-scoped route and getting a 403 nobody expected.
 *
 * `GET /course-orders` is RLS-scoped to the CALLER, not to a host, so it
 * answers with this learner's orders across every academy they have ever
 * bought from. `/my/purchases` is academy-scoped by construction, so the
 * page filters on `academyId` before it renders anything — see
 * `LearnerPurchasesPage` for why that filter is a tenancy requirement
 * rather than a tidy-up.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath } from '@api';
import type {
  CollectionQuery,
  CheckoutPaymentMethod,
  CourseOrder,
  CourseOrderPayment,
  CourseOrderRefund,
  CreateCourseOrderPayload,
  CreateCourseOrderPaymentPayload,
  LearnerCoursePayment,
  PaginatedResult,
  RequestCourseOrderRefundPayload,
} from '@types';

export class CourseOrderService extends BaseService {
  protected readonly resource = 'course-orders';

  /** Retrieves a page of the current learner's own course orders. */
  async getOrders(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<CourseOrder>> {
    return this.fetchCollection<CourseOrder>(query, options);
  }

  /** One order by id (RLS-scoped to the caller). */
  async getOrder(orderId: string, options?: ReadOptions): Promise<CourseOrder> {
    return this.fetchOne<CourseOrder>(orderId, options);
  }

  /**
   * P64 Phase 4 — open (or, idempotently, re-open) an order for a paid
   * course. `POST courses/:id/course-orders` lives under the `courses`
   * base, not this service's `course-orders` resource, so it is addressed
   * explicitly. The idempotency key makes a double-click return the same
   * open order rather than a second one.
   */
  async createOrder(
    courseId: string,
    payload: CreateCourseOrderPayload,
    options?: WriteOptions
  ): Promise<CourseOrder> {
    return this.client.post<CourseOrder, CreateCourseOrderPayload>(
      resourcePath('courses', courseId, 'course-orders'),
      payload,
      options
    );
  }

  /**
   * The methods this learner may actually pay THIS order with.
   *
   * Not `features/billing`'s `usePaymentMethods()`. That reads the
   * platform catalog at `GET /payment-methods`, which is behind
   * `ManagementSurfaceGuard` — staff only. A learner calling it gets
   * `managementSurfaceOnly`, which is why the checkout page used to show
   * "not available for purchase yet" to every learner regardless of what
   * their academy had configured. This route is the learner-surface
   * equivalent and returns only what the server would accept for this
   * order, so an offered method is always a payable one.
   */
  async getPaymentMethods(
    orderId: string,
    options?: ReadOptions
  ): Promise<CheckoutPaymentMethod[]> {
    return this.client.get<CheckoutPaymentMethod[]>(
      this.path(orderId, 'payment-methods'),
      options
    );
  }

  /**
   * Academy Manual Payments — the learner's own payment history
   * (`GET course-payments`), filtered server-side to the academy whose
   * portal they are in. Self-scoped by the session, never by a parameter.
   */
  async getMyPayments(
    academyId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<LearnerCoursePayment>> {
    return this.client.get<PaginatedResult<LearnerCoursePayment>>(
      'course-payments',
      {
        ...options,
        params: { academyId, page: 1, pageSize: 100, ...options?.params },
      }
    );
  }

  /** The learner's own proof file for one payment, as an authenticated Blob. */
  async getProofFile(
    orderId: string,
    paymentId: string,
    options?: ReadOptions
  ): Promise<Blob> {
    return this.client.get<Blob>(
      this.path(orderId, 'payments', paymentId, 'proof', 'file'),
      { ...options, responseType: 'blob' }
    );
  }

  /** Create a Payment against an order (buyer picks the method key). */
  async createPayment(
    orderId: string,
    payload: CreateCourseOrderPaymentPayload,
    options?: WriteOptions
  ): Promise<CourseOrderPayment> {
    return this.client.post<
      CourseOrderPayment,
      CreateCourseOrderPaymentPayload
    >(this.path(orderId, 'payments'), payload, options);
  }

  /** One payment of an order. */
  async getPayment(
    orderId: string,
    paymentId: string,
    options?: ReadOptions
  ): Promise<CourseOrderPayment> {
    return this.client.get<CourseOrderPayment>(
      this.path(orderId, 'payments', paymentId),
      options
    );
  }

  /**
   * Submit a manual-transfer proof for review. Mirrors the tenant billing
   * proof contract (base64 `fileData` + `fileName` + optional `note`) — the
   * same `useFilePicker` base64 pipeline, no new upload endpoint. Moves the
   * payment's `reviewStatus` to `pending`; never implies success.
   */
  async submitProof(
    orderId: string,
    paymentId: string,
    payload: {
      fileName: string;
      fileData: string;
      note?: string;
      payerReference?: string;
    },
    options?: WriteOptions
  ): Promise<CourseOrderPayment> {
    return this.client.patch<
      CourseOrderPayment,
      {
        fileName: string;
        fileData: string;
        note?: string;
        payerReference?: string;
      }
    >(this.path(orderId, 'payments', paymentId, 'proof'), payload, options);
  }

  /**
   * P13 — request a full, self-service refund of a paid order.
   *
   * No review gate server-side: inside the refund window the order is
   * refunded in the same request, it becomes `refunded`, and the learner's
   * enrollment in the course is revoked. The body's `idempotencyKey` is
   * what makes a replay of the same attempt safe (and what lets the HTTP
   * client replay it after a transient failure); a second request for an
   * already-refunded order returns the existing refund, never a second one.
   */
  async requestRefund(
    orderId: string,
    payload: RequestCourseOrderRefundPayload,
    options?: WriteOptions
  ): Promise<CourseOrderRefund> {
    return this.client.post<CourseOrderRefund, RequestCourseOrderRefundPayload>(
      this.path(orderId, 'refund'),
      payload,
      options
    );
  }

  /** P13 — the refund recorded against an order; `null` (not 404) when none exists. */
  async getRefund(
    orderId: string,
    options?: ReadOptions
  ): Promise<CourseOrderRefund | null> {
    return this.client.get<CourseOrderRefund | null>(
      this.path(orderId, 'refund'),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const courseOrderService = new CourseOrderService();
