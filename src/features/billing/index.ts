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

// Academy Manual Payments — an academy's own methods reuse the platform
// catalog's instruction panel, brand chip, detail fields, schemas and
// proof-file rules, so a payer sees and enters exactly the same shapes.
export {
  ManualPaymentInstructionsPanel,
  PlaceholderPaymentBanner,
} from './components/ManualPaymentInstructionsPanel';
export { ManualPaymentBrandChip } from './components/ManualPaymentBrandChip';
export { CopyValueButton } from './components/CopyValueButton';
export {
  BankTransferDetailsFields,
  InstapayDetailsFields,
  WalletDetailsFields,
} from './components/ManualMethodDetailsFields';
export { useManualMethodServerValidation } from './components/ManualMethodFormFields';
export {
  academyBankTransferMethodSchema,
  academyInstapayMethodSchema,
  academyWalletMethodSchema,
  bankTransferDetailsSchema,
  instapayDetailsSchema,
  walletDetailsSchema,
  type BankTransferDetailsFormData,
  type InstapayDetailsFormData,
  type WalletDetailsFormData,
} from './schemas/billing.schemas';
export {
  toBankTransferDetailsFormValues,
  toBankTransferDetailsPayload,
  toInstapayDetailsFormValues,
  toInstapayDetailsPayload,
  toWalletDetailsFormValues,
  toWalletDetailsPayload,
} from './utils/manual-method-form.utils';
export {
  ALLOWED_PAYMENT_PROOF_TYPES,
  MAX_PAYMENT_PROOF_FILE_SIZE,
  MAX_PAYMENT_PROOF_NOTE_LENGTH,
  MAX_PAYMENT_REVIEW_NOTES_LENGTH,
} from './constants/billing.constants';
export { manualDestination } from './utils/manual-payment-method.utils';
export { MANUAL_METHOD_ICONS } from './constants/manual-method-icons';
