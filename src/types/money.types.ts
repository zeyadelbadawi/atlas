/**
 * Money domain types.
 *
 * The single representation of a monetary value across Checkout/Payment/
 * Invoice (Prompt 7). Every amount is minor-unit integer + ISO 4217
 * currency code — never a float, and never a currency assumed by the
 * frontend. `Plan.pricing`/`AddOn.pricing` (`PlanPricingMetadata`, Prompt 6)
 * remain DISPLAY-ONLY catalog metadata; this is the real commercial
 * contract Checkout/Payment/Invoice compute and persist against.
 */

/**
 * ISO 4217 currency code (e.g. "USD", "EGP", "SAR", "AED"). A plain string,
 * not an enum — Atlas does not assume any specific currency is "the"
 * platform currency. The backend is the source of truth for which
 * currencies are actually usable.
 */
export type CurrencyCode = string;

/**
 * A monetary amount. `amountMinorUnits` is an integer in the currency's
 * smallest unit (e.g. cents for USD) — never a float, so `9900` means
 * "99.00 USD", never `99.00` directly. Formatting (including converting
 * back to major units for display) always goes through `formatMoney`
 * (`features/billing/utils/money.utils.ts`), never ad hoc division inside
 * a component.
 */
export interface Money {
  readonly amountMinorUnits: number;
  readonly currency: CurrencyCode;
}

/**
 * How often a plan subscription bills. Add-ons may be one-time (`undefined`)
 * or recurring. Named distinctly from the Prompt 3A, user-scoped
 * `BillingCycle` that used to live in `billing.types.ts` — same shape
 * today, but a different domain; this mirrors `TenantSubscriptionStatus`
 * doing the same for `SubscriptionStatus` in Prompt 6. That legacy file
 * was removed in Prompt 13 along with its only consumer, the fake
 * `BillingPage`.
 */
export type SubscriptionBillingCycle = 'monthly' | 'yearly';
