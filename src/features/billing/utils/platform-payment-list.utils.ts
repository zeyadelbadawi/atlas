/**
 * The Platform Owner's payment review lists (subscriptions on `/payments`,
 * course purchases on `/platform-course-order-payments`) share one filter
 * model: every filter, the search and the sort are sent to the server,
 * which applies them before paging. Nothing here filters rows client-side.
 */
import type { TFunction } from 'i18next';
import type { UrlListStateConfig } from '@hooks';
import type {
  CollectionQuery,
  ManualReviewStatus,
  Payment,
  PaymentLifecycleStatus,
  PaymentMethodType,
} from '@types';

/** "Pro · Yearly", "Add-on: Extra seats", or the key when no display name was frozen on the checkout. */
export function formatCheckoutSummary(
  t: TFunction,
  summary: Payment['checkoutSummary']
): string | undefined {
  if (!summary) return undefined;
  const name = summary.displayName ?? summary.targetKey;
  if (summary.targetType === 'add_on') {
    return t('payments:platformReview.addOnPlan', { name });
  }
  return summary.billingCycle
    ? t('payments:platformReview.planWithCycle', {
        plan: name,
        cycle: t(`payments:common.billingCycle.${summary.billingCycle}`),
      })
    : name;
}

export const PLATFORM_REVIEW_FILTERS = [
  'pending',
  'approved',
  'rejected',
  'all',
] as const;
export type PlatformReviewFilter = (typeof PLATFORM_REVIEW_FILTERS)[number];

export const PLATFORM_PAYMENT_STATUS_OPTIONS: readonly PaymentLifecycleStatus[] =
  [
    'created',
    'pending',
    'processing',
    'requires_action',
    'requires_confirmation',
    'succeeded',
    'failed',
    'cancelled',
    'expired',
  ];

export const PLATFORM_PAYMENT_METHOD_OPTIONS: readonly PaymentMethodType[] = [
  'manual_bank_transfer',
  'manual_wallet_transfer',
  'manual_instapay',
  'gateway',
];

/** `field_direction` — the label key suffix under `payments:listFilters.sortOptions`. */
export const PLATFORM_PAYMENT_SORT_OPTIONS = [
  'createdAt_desc',
  'createdAt_asc',
  'amount_desc',
  'amount_asc',
  'updatedAt_desc',
] as const;
export type PlatformPaymentSortOption =
  (typeof PLATFORM_PAYMENT_SORT_OPTIONS)[number];

export interface PlatformPaymentListState {
  readonly search: string;
  readonly reviewStatus: PlatformReviewFilter;
  readonly status: PaymentLifecycleStatus | 'all';
  readonly methodType: PaymentMethodType | 'all';
  /** `YYYY-MM-DD`, inclusive; empty = unbounded. */
  readonly from: string;
  readonly to: string;
  readonly sort: PlatformPaymentSortOption;
}

/** A review queue opens on what needs a decision: pending, newest first. */
export const DEFAULT_PLATFORM_PAYMENT_LIST_STATE: PlatformPaymentListState = {
  search: '',
  reviewStatus: 'pending',
  status: 'all',
  methodType: 'all',
  from: '',
  to: '',
  sort: 'createdAt_desc',
};

/**
 * How the list state is read from and written to the URL
 * (`useUrlListState`): every enumerated field against its own options, the
 * range as real dates. Shared by both review lists, so Back from a detail
 * page restores the queue the reviewer was working through.
 */
export const PLATFORM_PAYMENT_LIST_URL_CONFIG: UrlListStateConfig<PlatformPaymentListState> =
  {
    defaults: DEFAULT_PLATFORM_PAYMENT_LIST_STATE,
    allowed: {
      reviewStatus: PLATFORM_REVIEW_FILTERS,
      status: ['all', ...PLATFORM_PAYMENT_STATUS_OPTIONS],
      methodType: ['all', ...PLATFORM_PAYMENT_METHOD_OPTIONS],
      sort: PLATFORM_PAYMENT_SORT_OPTIONS,
    },
    dates: ['from', 'to'],
  };

export function hasActivePlatformPaymentFilters(
  state: PlatformPaymentListState
): boolean {
  return (
    state.search !== DEFAULT_PLATFORM_PAYMENT_LIST_STATE.search ||
    state.reviewStatus !== DEFAULT_PLATFORM_PAYMENT_LIST_STATE.reviewStatus ||
    state.status !== 'all' ||
    state.methodType !== 'all' ||
    state.from !== '' ||
    state.to !== '' ||
    state.sort !== DEFAULT_PLATFORM_PAYMENT_LIST_STATE.sort
  );
}

/** Builds the server query — flat filter params, `sortBy`/`sortDirection`, `search`. */
export function toPlatformPaymentQuery(
  state: PlatformPaymentListState,
  pagination: { readonly page: number; readonly pageSize: number }
): CollectionQuery {
  const [field, direction] = state.sort.split('_') as [
    'createdAt' | 'amount' | 'updatedAt',
    'asc' | 'desc',
  ];
  const filters: Record<string, string> = {};
  if (state.reviewStatus !== 'all') {
    filters.reviewStatus = state.reviewStatus satisfies Exclude<
      ManualReviewStatus,
      'not_required'
    >;
  }
  if (state.status !== 'all') filters.status = state.status;
  if (state.methodType !== 'all') filters.methodType = state.methodType;
  if (state.from) filters.from = state.from;
  if (state.to) filters.to = state.to;

  return {
    pagination,
    sort: { field, direction },
    ...(state.search.trim() ? { search: state.search.trim() } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}
