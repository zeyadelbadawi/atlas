/**
 * Payment Provider Adapter — the abstraction boundary.
 *
 * This is the seam a future real gateway (Stripe/Paymob/PayTabs/MyFatoorah/
 * HyperPay/etc.) plugs into. Every method here still calls Atlas's OWN
 * backend (`PaymentService`, a plain `BaseService`) — never a real
 * provider's SDK/API directly from the frontend. What this abstraction
 * buys is architectural, not networking: the Checkout/Payment UI, payment
 * history, subscription/entitlement integration, and authorization never
 * branch on "which provider" — they branch on `capabilities`, and a
 * concrete adapter (today: `ManualTransferProvider`; tomorrow: a
 * `StripeAdapter` etc.) is the only place that would need to change.
 *
 * See `Reports/ARCHITECTURE.md`, Prompt 7, "Provider Abstraction", for the
 * full rationale and the exact steps a real integration would require.
 */
import type {
  Checkout,
  Payment,
  PaymentIntent,
  PaymentMethodCapabilities,
  PaymentReturnParams,
} from '@types';

/**
 * Every capability a provider MIGHT support. A concrete adapter reports
 * which of these it actually does — the UI reads this, never a hardcoded
 * `if (provider === 'stripe')` (see `PaymentMethodCapabilities`, which this
 * mirrors exactly; a `PaymentMethod`'s capabilities are simply its
 * adapter's capabilities, catalog-published for the frontend to read
 * without resolving an adapter instance).
 */
export type PaymentProviderCapabilities = PaymentMethodCapabilities;

/**
 * The operations every provider adapter must support, regardless of
 * whether it is manual-review-based or gateway-based.
 */
export interface PaymentProviderAdapter {
  /** Matches `PaymentMethod.provider` / `Payment.provider`. */
  readonly providerKey: string;
  readonly capabilities: PaymentProviderCapabilities;

  /** Creates the Payment record for a Checkout using this provider/method. */
  createPayment(checkout: Checkout, methodKey: string): Promise<Payment>;

  /**
   * Retrieves the Payment's current, backend-authoritative status. Never
   * inferred from local/optimistic state. `organizationId` is always
   * passed explicitly — never trusted from a route/UI param — matching
   * every other Tenant-scoped call in Atlas (see acceptance criteria C-7-46).
   */
  getPaymentStatus(organizationId: string, paymentId: string): Promise<Payment>;

  /** Cancels a Payment, where `capabilities.supportsCancellation` allows it. */
  cancelPayment(organizationId: string, paymentId: string): Promise<Payment>;
}

/**
 * The additional operations a gateway-shaped provider supports. Only an
 * adapter with `capabilities.supportsRedirect` or
 * `supportsEmbeddedCheckout` needs to implement this — `ManualTransferProvider`
 * deliberately does not.
 */
export interface GatewayPaymentProviderAdapter extends PaymentProviderAdapter {
  /** Creates a gateway-ready `PaymentIntent` — a hosted-checkout URL or SDK configuration, backend-supplied. */
  createPaymentIntent(organizationId: string, checkout: Checkout): Promise<PaymentIntent>;

  /**
   * Called when the customer returns from the provider. `params` is
   * whatever the return URL carried (e.g. a `paymentId`) — used ONLY to
   * know which Payment to re-check; the method still re-fetches
   * authoritative status from the backend rather than trusting anything
   * about how the customer arrived back (see acceptance criteria C-7-27/28).
   */
  handleProviderReturn(organizationId: string, params: PaymentReturnParams): Promise<Payment>;

  /** Explicitly (re-)verifies a Payment against the provider/backend — the only source of truth for "did this succeed". */
  verifyPayment(organizationId: string, paymentId: string): Promise<Payment>;
}

/**
 * The additional operation a manual-review-based provider supports. Only
 * an adapter with `capabilities.supportsProof` needs to implement this.
 */
export interface ManualReviewPaymentProviderAdapter extends PaymentProviderAdapter {
  /** Submits proof of a manual transfer for review. Uploading proof never implies the payment succeeded — it only moves `reviewStatus` to `'pending'`. */
  submitProof(
    organizationId: string,
    paymentId: string,
    file: File,
    note?: string
  ): Promise<Payment>;
}

/** Narrows a generic adapter to its gateway-specific surface, when its capabilities say it has one. */
export function isGatewayProvider(
  adapter: PaymentProviderAdapter
): adapter is GatewayPaymentProviderAdapter {
  return (
    adapter.capabilities.supportsRedirect ||
    adapter.capabilities.supportsEmbeddedCheckout
  );
}

/** Narrows a generic adapter to its manual-review-specific surface, when its capabilities say it has one. */
export function isManualReviewProvider(
  adapter: PaymentProviderAdapter
): adapter is ManualReviewPaymentProviderAdapter {
  return adapter.capabilities.supportsProof;
}
