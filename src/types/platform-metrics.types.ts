/**
 * Platform Command Center metrics (Prompt 13).
 *
 * Replaces `PlatformDashboardPage`'s hardcoded `0`s and `PlatformMetrics`'s
 * hardcoded `[100, 0, 100]` array (Prompt 3A legacy scaffold) with a real,
 * typed, singleton contract. Carries EXACTLY the seven KPIs the original
 * scaffold already named — no additional KPIs are invented, per Prompt
 * 13's Platform Command Center boundary.
 */

/** A single KPI's current value plus its change over the previous period, when the backend can compute one. */
export interface PlatformMetricTrend {
  readonly value: number;
  /** Percentage change vs. the prior period. Omitted when the backend has no prior-period baseline yet. */
  readonly changePercent?: number;
}

/** Revenue, using the same `{ amount, currency }` shape as `PlanPricingMetadata`. */
export interface PlatformRevenueMetric {
  readonly amount: number;
  readonly currency: string;
  readonly changePercent?: number;
}

/** The Platform Command Center's complete metrics snapshot — a singleton, not a paginated collection. */
export interface PlatformMetricsOverview {
  readonly totalAcademies: PlatformMetricTrend;
  readonly totalUsers: PlatformMetricTrend;
  readonly activeCourses: PlatformMetricTrend;
  readonly revenue: PlatformRevenueMetric;
  /** 0–100. */
  readonly systemHealthPercent: number;
  /** 0–100. */
  readonly storageUsagePercent: number;
  /** 0–100. */
  readonly apiUptimePercent: number;
  /** When the backend computed this snapshot — rendered verbatim, never `Date.now()` at render time. */
  readonly generatedAt: string;
}
