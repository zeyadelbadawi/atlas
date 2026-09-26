/**
 * Platform Course-Order Payment Service.
 *
 * `/platform-course-order-payments*` — the Course Commerce analog of
 * `PlatformPaymentService` (subscription payments on `/payments`). The
 * backend keeps the two review queues on separate route trees so they never
 * bleed into each other; this service mirrors that split instead of adding
 * a mode flag to `PlatformPaymentService`.
 *
 * `PlatformOwnerGuard`-gated server-side. The frontend route guard is UX
 * only; the backend is the authority.
 *
 * ONE HYPHENATED RESOURCE SEGMENT — `resourcePath()` encodes each segment,
 * so a slashed resource would 404.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  ApprovePaymentPayload,
  CollectionQuery,
  CourseOrderPayment,
  PaginatedResult,
  RejectPaymentPayload,
} from '@types';

export class PlatformCourseOrderPaymentService extends BaseService {
  protected readonly resource = 'platform-course-order-payments';

  /** Course-order payments across every academy. Accepts `filters.reviewStatus`. */
  async getPayments(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<CourseOrderPayment>> {
    return this.fetchCollection<CourseOrderPayment>(query, options);
  }

  async getPayment(
    paymentId: string,
    options?: ReadOptions
  ): Promise<CourseOrderPayment> {
    return this.fetchOne<CourseOrderPayment>(paymentId, options);
  }

  /** Approving grants the learner access to the course. Only valid while `reviewStatus === 'pending'`. */
  async approvePayment(
    paymentId: string,
    payload: ApprovePaymentPayload,
    options?: WriteOptions
  ): Promise<CourseOrderPayment> {
    return this.client.post<CourseOrderPayment, ApprovePaymentPayload>(
      this.path(paymentId, 'approve'),
      payload,
      options
    );
  }

  /** `notes` is required — the learner needs an actionable reason. */
  async rejectPayment(
    paymentId: string,
    payload: RejectPaymentPayload,
    options?: WriteOptions
  ): Promise<CourseOrderPayment> {
    return this.client.post<CourseOrderPayment, RejectPaymentPayload>(
      this.path(paymentId, 'reject'),
      payload,
      options
    );
  }

  /**
   * The submitted proof as an authenticated `Blob`. Never link
   * `payment.proof.fileUrl` directly — see
   * `PlatformPaymentService.getProofFile` for why that hits the SPA router.
   */
  async getProofFile(paymentId: string, options?: ReadOptions): Promise<Blob> {
    return this.client.get<Blob>(this.path(paymentId, 'proof', 'file'), {
      ...options,
      responseType: 'blob',
    });
  }
}

export const platformCourseOrderPaymentService =
  new PlatformCourseOrderPaymentService();
