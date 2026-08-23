/**
 * Payment domain types.
 *
 * The provider-agnostic core of Prompt 7. Every type here is deliberately
 * shaped so a manual-transfer payment and a future real gateway payment are
 * the SAME `Payment` record, distinguished only by `methodType`/`provider`
 * and which of the optional, capability-gated fields are populated —
 * never two parallel payment models. See `Reports/ARCHITECTURE.md`,
 * Prompt 7, for the full provider-abstraction rationale.
 */
import type { Money } from './money.types';

/** The three payment-method shapes Prompt 7's architecture supports. Only the two `manual_*` ones are ever enabled today — `gateway` exists so the type system, UI and services are ready before a real gateway is connected. */
export type PaymentMethodType =
  | 'manual_bank_transfer'
  | 'manual_wallet_transfer'
  | 'gateway';

/**
 * What a payment method can actually do. The UI reads these flags —
 * never a hardcoded `if (methodType === 'manual_bank_transfer')` — so a
 * future gateway method that happens to require manual review (a real,
 * if unusual, business case) is handled correctly without an if/else
 * rewrite (see acceptance criteria C-7-15/16/39).
 */
export interface PaymentMethodCapabilities {
  readonly supportsManualReview: boolean;
  readonly supportsProof: boolean;
  readonly supportsRedirect: boolean;
  readonly supportsEmbeddedCheckout: boolean;
  readonly supportsAdditionalAuthentication: boolean;
  readonly supportsWebhooks: boolean;
  readonly supportsRefunds: boolean;
  readonly supportsRecurring: boolean;
  readonly supportsCancellation: boolean;
}

/** Configurable manual bank-transfer instructions. Backend-supplied — never hardcoded real banking details in the frontend. */
export interface BankTransferInstructions {
  readonly type: 'manual_bank_transfer';
  readonly bankName: string;
  readonly accountName: string;
  readonly accountNumber: string;
  readonly iban?: string;
  readonly instructions: string;
  readonly referenceInstructions: string;
}

/** Configurable manual wallet-transfer instructions. Backend-supplied — never hardcoded real wallet details in the frontend. */
export interface WalletTransferInstructions {
  readonly type: 'manual_wallet_transfer';
  readonly walletProvider: string;
  readonly walletNumber: string;
  readonly accountName: string;
  readonly instructions: string;
  readonly referenceInstructions: string;
}

export type ManualPaymentInstructions =
  | BankTransferInstructions
  | WalletTransferInstructions;

/**
 * A payment method as a first-class catalog object — never a hardcoded
 * string switch in a component. Catalog-scoped like `Plan`/`AddOn`
 * (Prompt 6), not Tenant-owned. Named distinctly from the Prompt 3A,
 * user-scoped `PaymentMethod` (a saved card on file) that used to live in
 * `billing.types.ts` — a different concept entirely; that legacy file was
 * removed in Prompt 13 along with its only consumer, the fake
 * `BillingPage`.
 */
export interface CheckoutPaymentMethod {
  readonly id: string;
  readonly key: string;
  readonly type: PaymentMethodType;
  readonly displayName: string;
  readonly description?: string;
  readonly enabled: boolean;
  /** Provider key this method is handled by — see `PaymentProviderAdapter.providerKey`. */
  readonly provider: string;
  readonly capabilities: PaymentMethodCapabilities;
  /** Present only for `manual_bank_transfer`/`manual_wallet_transfer`; never populated for `gateway`. */
  readonly manualInstructions?: ManualPaymentInstructions;
}

/**
 * A Payment's commercial lifecycle. Shared by manual and gateway payments —
 * NOT payment-method-specific. Manual review is tracked separately (see
 * `ManualReviewStatus`) precisely so this enum doesn't need
 * manual-transfer-only states mixed into a gateway-shaped state machine.
 * Named distinctly from the Prompt 3A, user-scoped `PaymentStatus` (a
 * simple 4-state invoice-line status) that used to live in
 * `billing.types.ts` — this is the real Payment lifecycle Prompt 7
 * introduces. That legacy file was removed in Prompt 13 along with its
 * only consumer, the fake `BillingPage`.
 */
export type PaymentLifecycleStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'requires_confirmation'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired';

/** Terminal statuses — once reached, a Payment's status will not change further, so polling stops (see `usePaymentDetails`). */
export const TERMINAL_PAYMENT_STATUSES: readonly PaymentLifecycleStatus[] = [
  'succeeded',
  'failed',
  'cancelled',
  'expired',
];

/**
 * Manual review is a SEPARATE capability/state from `PaymentLifecycleStatus` — it
 * only applies when `CheckoutPaymentMethod`'s `capabilities.supportsManualReview` is
 * true. A gateway payment's `reviewStatus` is `'not_required'` by default
 * (see acceptance criteria C-7-15/16/21).
 */
export type ManualReviewStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

/** One provider interaction attempt toward completing a Payment. A Payment may have several — most relevant for gateway retries; a manual payment typically has exactly one. */
export type PaymentAttemptStatus =
  | 'initiated'
  | 'processing'
  | 'failed'
  | 'succeeded'
  | 'cancelled'
  | 'expired';

export interface PaymentAttempt {
  readonly id: string;
  readonly paymentId: string;
  readonly status: PaymentAttemptStatus;
  readonly providerReference?: string;
  readonly failureReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A manual-transfer proof of payment. Uploaded through the existing base64 `useFilePicker` contract (see `billing.constants.ts`) — no new upload endpoint. */
export interface PaymentProof {
  readonly id: string;
  readonly paymentId: string;
  readonly fileName: string;
  /** Authorized URL — access-controlled by the backend, never a public asset path. */
  readonly fileUrl: string;
  readonly mimeType: string;
  readonly note?: string;
  readonly uploadedAt: string;
}

/**
 * A generic, provider-agnostic description of what the customer/UI must do
 * next. The core Payment domain never encodes a specific provider's
 * action shape (e.g. Stripe's `next_action`) — a future gateway adapter
 * normalizes into this before the value ever reaches a component.
 */
export type PaymentNextAction =
  | { readonly type: 'redirect'; readonly redirectUrl: string }
  | { readonly type: 'additional_authentication'; readonly description: string }
  | { readonly type: 'awaiting_manual_review' }
  | { readonly type: 'awaiting_proof' };

/**
 * The commercial payment operation. ONE shape for manual and gateway
 * payments — `methodType`/`provider` and which optional fields are
 * populated are what differ, never a parallel type per method.
 */
export interface Payment {
  readonly id: string;
  readonly organizationId: string;
  readonly checkoutId: string;
  readonly methodKey: string;
  readonly methodType: PaymentMethodType;
  readonly provider: string;
  readonly money: Money;
  readonly status: PaymentLifecycleStatus;
  readonly reviewStatus: ManualReviewStatus;
  readonly proof?: PaymentProof;
  readonly attempts: readonly PaymentAttempt[];
  readonly failureReason?: string;
  /** The latest manual review's notes, denormalized onto the Payment for convenience — the Tenant needs to see why a rejection happened without a second fetch. */
  readonly reviewNotes?: string;
  readonly nextAction?: PaymentNextAction;
  /** Set only once a provider (gateway) has acknowledged the payment. Never present for a manual payment. */
  readonly providerReference?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
}

/**
 * Gateway-ready payment-intent semantics (see `GatewayPaymentProviderAdapter`).
 * The frontend never fabricates one of these — `checkoutUrl`/
 * `providerReference` only ever come from a real `createPaymentIntent`
 * backend response.
 */
export interface PaymentIntent {
  readonly id: string;
  readonly checkoutId: string;
  readonly organizationId: string;
  readonly provider: string;
  readonly money: Money;
  readonly status: PaymentLifecycleStatus;
  /** Idempotency-safe reference the frontend generated for this intent creation. */
  readonly clientReference: string;
  readonly providerReference?: string;
  /** Hosted-checkout / redirect URL, backend-supplied — never constructed on the frontend. */
  readonly checkoutUrl?: string;
  readonly expiresAt: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** An admin's manual-review decision on a Payment. */
export interface PaymentReview {
  readonly id: string;
  readonly paymentId: string;
  readonly status: ManualReviewStatus;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly notes?: string;
}

/** Payload for creating a Payment against an existing Checkout, for a chosen payment method. */
export interface CreatePaymentPayload {
  readonly checkoutId: string;
  readonly methodKey: string;
}

/**
 * Payload for submitting manual-transfer proof. `fileData` is a base64
 * data URL — the same no-upload-endpoint pattern every file in Atlas uses
 * (Course thumbnails, Academy branding, Assignment attachments), read via
 * `FileReader` in the page, never a multipart upload.
 */
export interface SubmitPaymentProofPayload {
  readonly fileData: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly note?: string;
}

export interface ApprovePaymentPayload {
  readonly notes?: string;
}

export interface RejectPaymentPayload {
  readonly notes: string;
}

/**
 * What a gateway return route reads to know WHICH payment to re-check —
 * NEVER trusted as proof of outcome. See `Reports/ARCHITECTURE.md`,
 * Prompt 7, "Never trust redirect parameters".
 */
export interface PaymentReturnParams {
  readonly paymentId: string;
  readonly clientReference?: string;
}

/**
 * Invoice-ready domain contract. No accounting logic — a read-only record
 * the backend produces. Named distinctly from the Prompt 3A, user-scoped
 * `Invoice` that used to live in `billing.types.ts` (its own
 * `invoiceNumber`/`items`/`periodStart` shape) — this is the
 * organization-scoped equivalent, matching `TenantSubscription`/
 * `TenantUsage`/`TenantAddOn`'s naming (Prompt 6).
 */
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';

export interface TenantInvoice {
  readonly id: string;
  readonly organizationId: string;
  readonly paymentId?: string;
  readonly number: string;
  readonly status: InvoiceStatus;
  readonly money: Money;
  readonly issuedAt?: string;
  readonly dueAt?: string;
  readonly paidAt?: string;
}

/**
 * Normalized payment webhook event contract — documentation for the future
 * backend, not consumed by any frontend runtime code path. Webhooks are a
 * server-to-server concern; the frontend never receives or processes one
 * directly (see `Reports/ARCHITECTURE.md`, Prompt 7, "Webhook Architecture").
 * Provider-specific payload names (e.g. Stripe's `payment_intent.succeeded`)
 * must be normalized to this shape before reaching the core payment domain.
 */
export type PaymentWebhookEventType =
  | 'payment.created'
  | 'payment.processing'
  | 'payment.requires_action'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.expired'
  | 'refund.created'
  | 'refund.succeeded'
  | 'refund.failed';

export interface PaymentWebhookEvent {
  readonly id: string;
  readonly type: PaymentWebhookEventType;
  readonly paymentId: string;
  readonly occurredAt: string;
}
