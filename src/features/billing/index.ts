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
 * misleadingly separate from) the real Tenant billing surface above.
 *
 * `formatMoney` is published here because a second feature now needs it:
 * P64 Phase 2's learner Purchases page renders course-order receipts, and
 * `money.utils.ts` is deliberately "the ONLY place `amountMinorUnits` is
 * converted to a display string". Reaching it through this barrel keeps
 * that true; copying the divisor into `features/learner` would make it
 * false the first time a currency needed a different minor-unit exponent.
 */
export { formatMoney } from './utils/money.utils';
// The Platform Owner's course-payment review (`@features/platform-commerce`)
// badges the SAME payment lifecycle/review enums, so it reuses these tone
// maps rather than copying them.
export {
  getManualReviewStatusTone,
  getPaymentStatusTone,
} from './utils/payment-status.utils';
// Course order / refund badges — the academy Orders page and the Platform
// course-payment review show the same statuses.
export {
  getCourseOrderStatusTone,
  getRefundStatusTone,
} from './utils/course-order-status.utils';
// The Platform review lists' shared server-side search/filter/sort model,
// reused by the course-payment review in `@features/platform-commerce`.
export { PlatformPaymentListToolbar } from './components/PlatformPaymentListToolbar';
export {
  DEFAULT_PLATFORM_PAYMENT_LIST_STATE,
  PLATFORM_PAYMENT_LIST_URL_CONFIG,
  toPlatformPaymentQuery,
  type PlatformPaymentListState,
} from './utils/platform-payment-list.utils';
// P64 Phase 4 — the learner course-checkout reuses the platform-owned
// payment-method catalog (not org-scoped), the same way it reuses formatMoney.
export { usePaymentMethods } from './hooks/usePaymentMethods';
