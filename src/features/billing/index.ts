/**
 * Billing feature exports.
 *
 * The real Tenant billing experience (subscription/usage/add-ons/checkout/
 * invoices/payment history) lives under `@features/tenant` (Prompt 6/7),
 * with Platform Owner payment review here in `@features/billing`
 * (`PlatformPaymentReviewListPage`/`PlatformPaymentReviewDetailPage`).
 *
 * Prompt 13 removed this feature's legacy `BillingPage` — a Prompt 3A
 * scaffold with a hardcoded "Active" plan badge, a non-functional
 * "Upgrade" button, and permanently-empty payment method/history
 * sections, never wired to any real data. It duplicated (and was
 * misleadingly separate from) the real Tenant billing surface above. No
 * feature currently imports this barrel; it is kept for the next page
 * this feature adds.
 */
export {};
