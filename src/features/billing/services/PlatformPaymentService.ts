/**
 * Platform Payment Service.
 *
 * A SEPARATE, flat `payments` resource — deliberately not nested under
 * `organizations/:organizationId`, unlike `PaymentService`. A platform
 * billing administrator reviews payments ACROSS every Tenant, the same
 * "third service tree over one entity" reasoning `InstructorService`
 * (Prompt 5) already established for teaching data: the authorization
 * shape (platform-review-scoped) differs from both the Tenant's own view
 * (`PaymentService`) and would be actively wrong to force into an
 * organization-scoped path. Extends BaseService to keep the same
 * architectural contract.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  ApprovePaymentPayload,
  CollectionQuery,
  PaginatedResult,
  Payment,
  QueryParams,
  RejectPaymentPayload,
} from '@types';

export class PlatformPaymentService extends BaseService {
  protected readonly resource = 'payments';

  /** Retrieves payments across every organization, for platform review. */
  async getPayments(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Payment>> {
    return this.fetchCollection<Payment>(query, options);
  }

  /** Retrieves one Payment for platform review. */
  async getPayment(paymentId: string, options?: ReadOptions): Promise<Payment> {
    return this.fetchOne<Payment>(paymentId, options);
  }

  /** Approves a manually-reviewed Payment. Only meaningful when `reviewStatus === 'pending'`. */
  async approvePayment(
    paymentId: string,
    payload: ApprovePaymentPayload,
    options?: WriteOptions
  ): Promise<Payment> {
    return this.client.post<Payment, ApprovePaymentPayload>(
      this.path(paymentId, 'approve'),
      payload,
      options
    );
  }

  /** Rejects a manually-reviewed Payment. `notes` is required — the Tenant needs an actionable reason. */
  async rejectPayment(
    paymentId: string,
    payload: RejectPaymentPayload,
    options?: WriteOptions
  ): Promise<Payment> {
    return this.client.post<Payment, RejectPaymentPayload>(
      this.path(paymentId, 'reject'),
      payload,
      options
    );
  }

  /**
   * Downloads a submitted proof file as a `Blob`, for the reviewer to open
   * as a local object URL (`URL.createObjectURL`).
   *
   * Never use `payment.proof.fileUrl` directly as a link `href` — it is a
   * path relative to the API base (not an absolute URL, and this endpoint
   * requires the Bearer token every other Atlas request already carries
   * via `HttpClient`'s interceptor), so a plain anchor tag resolves it
   * against the frontend's own origin and hits the SPA router instead of
   * the backend (confirmed live: opened as `http://localhost:3001/…` and
   * hit `NotFoundPage`, a real 404, not a permissions issue).
   */
  async getProofFile(paymentId: string, options?: ReadOptions): Promise<Blob> {
    return this.client.get<Blob>(this.path(paymentId, 'proof', 'file'), {
      ...options,
      responseType: 'blob',
    });
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformPaymentService = new PlatformPaymentService();
