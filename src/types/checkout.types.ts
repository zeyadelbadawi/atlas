/**
 * Checkout domain types.
 *
 * A Checkout is the commercial record of "what the Tenant is buying" —
 * created before any payment method is chosen, and preserved unchanged
 * (via its `snapshot`) even if the catalog Plan/Add-on it referenced later
 * changes. Payment (`payment.types.ts`) is a SEPARATE record: a Checkout
 * can exist without ever being paid, and a Checkout's existence never
 * implies the Tenant's subscription/add-ons changed — only an
 * authoritative, backend-confirmed `Payment.status === 'succeeded'` does
 * that (see `Reports/ARCHITECTURE.md`, Prompt 7, "Payment is not
 * Subscription").
 */
import type { Money, SubscriptionBillingCycle } from './money.types';

/** What a Checkout is paying for. A plan (subscription) change, or a catalog Add-on. */
export type CheckoutTargetType = 'plan_subscription' | 'add_on';

export interface PlanSubscriptionCheckoutTarget {
  readonly type: 'plan_subscription';
  /** Matches a `Plan.key` in the catalog (Prompt 6). */
  readonly planKey: string;
}

export interface AddOnCheckoutTarget {
  readonly type: 'add_on';
  /** Matches an `AddOn.key` in the catalog (Prompt 6). */
  readonly addOnKey: string;
}

export type CheckoutTarget = PlanSubscriptionCheckoutTarget | AddOnCheckoutTarget;

/**
 * A Checkout's lifecycle. Deliberately small and generic — a Checkout only
 * tracks whether it is still awaiting payment, not payment-method-specific
 * detail (that lives on `Payment`/`PaymentAttempt`).
 */
export type CheckoutStatus =
  | 'draft'
  | 'pending_payment'
  | 'completed'
  | 'expired'
  | 'cancelled';

/**
 * The frozen commercial detail captured at Checkout creation time. A
 * Checkout's snapshot NEVER gets recomputed from the live catalog — if the
 * Plan's price changes tomorrow, every Checkout created today keeps
 * yesterday's price. Only `createCheckout` populates this; nothing else
 * ever mutates it.
 */
export interface CheckoutSnapshot {
  readonly target: CheckoutTarget;
  readonly billingCycle?: SubscriptionBillingCycle;
  readonly displayName: string;
  readonly price: Money;
  readonly capturedAt: string;
}

export interface Checkout {
  readonly id: string;
  readonly organizationId: string;
  readonly target: CheckoutTarget;
  readonly billingCycle?: SubscriptionBillingCycle;
  readonly snapshot: CheckoutSnapshot;
  readonly status: CheckoutStatus;
  readonly expiresAt: string;
  /**
   * Client-generated once per checkout attempt and replayed on every
   * `createCheckout` retry, so a network retry can never create two
   * Checkouts for the same intent. The backend is the authority on
   * enforcing this — see `Reports/ARCHITECTURE.md`, Prompt 7, "Idempotency".
   */
  readonly idempotencyKey: string;
  readonly createdAt: string;
}

export interface CreateCheckoutPayload {
  readonly target: CheckoutTarget;
  readonly billingCycle?: SubscriptionBillingCycle;
  readonly idempotencyKey: string;
}
