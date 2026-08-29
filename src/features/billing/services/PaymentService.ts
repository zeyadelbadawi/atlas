/**
 * Payment Service.
 *
 * Tenant-scoped Payment operations, nested under the organization's
 * resource path (same nesting pattern as `CheckoutService`). The payment
 * method catalog is exposed here too (via a manually-built path, the same
 * pattern `PlanService` already uses for the Add-on catalog) rather than a
 * fourth billing service, since it would only ever hold one read method —
 * it is NOT organization-scoped, unlike everything else in this file.
 *
 * `createPaymentIntent` is a real, callable gateway-ready contract — not a
 * fake implementation. No adapter in `PaymentProviderRegistry` calls it
 * today (only `ManualTransferProvider` is registered), but the endpoint
 * shape exists so a future `GatewayPaymentProviderAdapter` only needs to
 * call it, not invent it.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath, toCollectionParams } from '@api';
import type {
  CheckoutPaymentMethod,
  CollectionQuery,
  CreatePaymentPayload,
  Payment,
  PaymentIntent,
  PaginatedResult,
  SubmitPaymentProofPayload,
  TenantInvoice,
} from '@types';

export class PaymentService extends BaseService {
  protected readonly resource = 'organizations';

  private paymentsPath(organizationId: string, ...segments: readonly string[]): string {
    return this.path(organizationId, 'payments', ...segments);
  }

  /** Retrieves every enabled payment method — catalog-scoped, not per-organization. */
  async getPaymentMethods(
    options?: ReadOptions
  ): Promise<readonly CheckoutPaymentMethod[]> {
    return this.client.get<readonly CheckoutPaymentMethod[]>(
      resourcePath('payment-methods'),
      options
    );
  }

  /** Creates a Payment against an existing Checkout, for a chosen payment method. */
  async createPayment(
    organizationId: string,
    payload: CreatePaymentPayload,
    options?: WriteOptions
  ): Promise<Payment> {
    return this.client.post<Payment, CreatePaymentPayload>(
      this.paymentsPath(organizationId),
      payload,
      options
    );
  }

  /**
   * Retrieves the organization's payment history (paginated).
   *
   * Must go through `toCollectionParams` — Axios serializes a raw nested
   * `CollectionQuery` (`{pagination:{page,pageSize}}`) into
   * `pagination[page]=1&pagination[pageSize]=10`, which the backend's flat
   * `CollectionQueryDto` rejects with a 400 (confirmed live: `GET
   * .../payments` on the Billing Overview page). Same root cause and fix
   * as `ProvisioningService.getProvisioningRequests`.
   */
  async getPayments(
    organizationId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Payment>> {
    return this.client.get<PaginatedResult<Payment>>(
      this.paymentsPath(organizationId),
      { ...options, params: { ...toCollectionParams(query), ...options?.params } }
    );
  }

  /**
   * Retrieves one Payment's current, backend-authoritative state. Used
   * both for a payment's details page and for `usePaymentDetails`'s
   * terminal-state-aware polling — there is no separate "status" endpoint,
   * since the full record already carries `status`.
   */
  async getPayment(
    organizationId: string,
    paymentId: string,
    options?: ReadOptions
  ): Promise<Payment> {
    return this.client.get<Payment>(
      this.paymentsPath(organizationId, paymentId),
      options
    );
  }

  /**
   * Submits manual-transfer proof. This moves `Payment.reviewStatus` to
   * `'pending'` on the backend — it never implies success on its own (see
   * `Reports/ARCHITECTURE.md`, Prompt 7, "Payment Is Not Subscription").
   */
  async submitProof(
    organizationId: string,
    paymentId: string,
    payload: SubmitPaymentProofPayload,
    options?: WriteOptions
  ): Promise<Payment> {
    return this.client.patch<Payment, SubmitPaymentProofPayload>(
      this.paymentsPath(organizationId, paymentId, 'proof'),
      payload,
      options
    );
  }

  /**
   * Downloads a submitted proof file as a `Blob`, for the Tenant to open as
   * a local object URL (`URL.createObjectURL`). See
   * `PlatformPaymentService.getProofFile`'s doc comment — `payment.proof.fileUrl`
   * is never a usable link `href` on its own.
   */
  async getProofFile(
    organizationId: string,
    paymentId: string,
    options?: ReadOptions
  ): Promise<Blob> {
    return this.client.get<Blob>(this.paymentsPath(organizationId, paymentId, 'proof', 'file'), {
      ...options,
      responseType: 'blob',
    });
  }

  /** Cancels a Payment, where its method's capabilities allow it. */
  async cancelPayment(
    organizationId: string,
    paymentId: string,
    options?: WriteOptions
  ): Promise<Payment> {
    return this.client.post<Payment, undefined>(
      this.paymentsPath(organizationId, paymentId, 'cancel'),
      undefined,
      options
    );
  }

  /** Creates a gateway-ready `PaymentIntent` for a Checkout. See the class doc comment — a real contract, not a fake implementation. */
  async createPaymentIntent(
    organizationId: string,
    checkoutId: string,
    options?: WriteOptions
  ): Promise<PaymentIntent> {
    return this.client.post<PaymentIntent, { checkoutId: string }>(
      this.paymentsPath(organizationId, 'intents'),
      { checkoutId },
      options
    );
  }

  /**
   * Retrieves the organization's invoices (paginated). Invoice-ready
   * contract — see `TenantInvoice`. Same `toCollectionParams` requirement
   * as `getPayments` above.
   */
  async getInvoices(
    organizationId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<TenantInvoice>> {
    return this.client.get<PaginatedResult<TenantInvoice>>(
      this.path(organizationId, 'invoices'),
      { ...options, params: { ...toCollectionParams(query), ...options?.params } }
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const paymentService = new PaymentService();
