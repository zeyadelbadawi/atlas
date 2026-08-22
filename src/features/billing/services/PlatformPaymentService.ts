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
}

/** Singleton instance following the Atlas service pattern. */
export const platformPaymentService = new PlatformPaymentService();
