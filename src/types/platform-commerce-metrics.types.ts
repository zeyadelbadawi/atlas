/**
 * Platform commerce metrics (P64 Phase 4) — mirrors the backend
 * `GET /platform-metrics/commerce` contract field for field.
 *
 * Counts and minor-unit amounts only: the response carries no tenant
 * names, no order ids and no buyer identities. `revenue.paidByCurrency`
 * is keyed by ISO-4217 code and MUST go through `formatMoney` — no page
 * divides by 100 itself.
 */

export interface PlatformCommerceOrderCounts {
  readonly created: number;
  readonly pendingPayment: number;
  readonly paid: number;
  readonly expired: number;
  readonly refunded: number;
  readonly cancelled: number;
}

export interface PlatformCommercePaymentCounts {
  /** Current backlog of manual payments awaiting an operator's review. */
  readonly awaitingReview: number;
  readonly approvedInWindow: number;
  readonly rejectedInWindow: number;
}

export interface PlatformCommerceApprovalLatency {
  /** Seconds from submission to approval; `null` when the sample is empty. */
  readonly p50: number | null;
  readonly p95: number | null;
  readonly sampleSize: number;
  /** The sample was capped, so the percentiles describe a subset. */
  readonly truncated: boolean;
}

export interface PlatformCommerceRefundCounts {
  readonly requestedInWindow: number;
  readonly completedInWindow: number;
}

export interface PlatformCommerceRevenue {
  /** Minor units (e.g. cents) per ISO-4217 currency code. */
  readonly paidByCurrency: Readonly<Record<string, number>>;
}

export interface PlatformCommerceMetrics {
  readonly windowDays: number;
  readonly generatedAt: string;
  readonly orders: PlatformCommerceOrderCounts;
  readonly payments: PlatformCommercePaymentCounts;
  readonly approvalLatencySeconds: PlatformCommerceApprovalLatency;
  readonly refunds: PlatformCommerceRefundCounts;
  readonly revenue: PlatformCommerceRevenue;
}
