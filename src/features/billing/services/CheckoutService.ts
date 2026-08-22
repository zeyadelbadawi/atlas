/**
 * Checkout Service.
 *
 * Every Checkout belongs to a specific organization (Tenant), so every
 * operation is nested under that organization's resource path — the same
 * nesting pattern `AcademyService`/`CourseService` already use for their
 * own sub-resources. Extends BaseService to keep the same architectural
 * contract.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { Checkout, CreateCheckoutPayload } from '@types';

export class CheckoutService extends BaseService {
  protected readonly resource = 'organizations';

  private checkoutsPath(organizationId: string, ...segments: readonly string[]): string {
    return this.path(organizationId, 'checkouts', ...segments);
  }

  /**
   * Creates a Checkout. `payload.idempotencyKey` is generated once per
   * checkout attempt by the caller and replayed on retry, so a network
   * retry can never create two Checkouts for one intent — the backend is
   * the authority on enforcing this (see `Reports/ARCHITECTURE.md`,
   * Prompt 7, "Idempotency").
   */
  async createCheckout(
    organizationId: string,
    payload: CreateCheckoutPayload,
    options?: WriteOptions
  ): Promise<Checkout> {
    return this.client.post<Checkout, CreateCheckoutPayload>(
      this.checkoutsPath(organizationId),
      payload,
      options
    );
  }

  /** Retrieves a Checkout, including its frozen commercial `snapshot`. */
  async getCheckout(
    organizationId: string,
    checkoutId: string,
    options?: ReadOptions
  ): Promise<Checkout> {
    return this.client.get<Checkout>(
      this.checkoutsPath(organizationId, checkoutId),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const checkoutService = new CheckoutService();
