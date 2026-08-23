/**
 * Platform Analytics types (Prompt 13).
 *
 * Replaces `AnalyticsPage`'s hardcoded `0`/`$0` metrics and permanently
 * empty tabs (Prompt 3A legacy scaffold) with a real, typed, filterable
 * contract. Carries exactly the four KPIs the scaffold already named
 * (`totalUsers`, `activeUsers`, `engagementRate`, `revenue`) — no
 * additional KPI is invented — plus the time-series/breakdown shapes
 * needed to render the "Users" / "Engagement" / "Revenue" tabs with real
 * chart data instead of a static "empty" placeholder.
 */

/** An inclusive date range filter, applied to every Analytics query. */
export interface AnalyticsDateRange {
  /** ISO 8601 date, e.g. "2026-07-24". */
  readonly from: string;
  /** ISO 8601 date, e.g. "2026-08-22". */
  readonly to: string;
}

/** Every Analytics read accepts the same date-range filter. */
export interface AnalyticsQuery {
  readonly dateRange?: AnalyticsDateRange;
}

/** A single KPI's current value plus its change over the selected date range, when the backend can compute one. */
export interface AnalyticsMetricTrend {
  readonly value: number;
  readonly changePercent?: number;
}

/** The Overview tab's four KPIs — a singleton snapshot for the active date range, not a paginated collection. */
export interface AnalyticsOverview {
  readonly totalUsers: AnalyticsMetricTrend;
  readonly activeUsers: AnalyticsMetricTrend;
  /** 0–100. */
  readonly engagementRatePercent: number;
  readonly engagementRateChangePercent?: number;
  readonly revenue: AnalyticsMetricTrend;
  readonly revenueCurrency: string;
  readonly generatedAt: string;
}

/** One point on a time-series chart. */
export interface AnalyticsTimeSeriesPoint {
  /** ISO 8601 date. */
  readonly date: string;
  readonly value: number;
}

/** A named metric's values across the selected date range. */
export interface AnalyticsTimeSeries {
  readonly metric: string;
  readonly points: readonly AnalyticsTimeSeriesPoint[];
}

/** One category's value within a breakdown (e.g. "by plan", "by organization"). */
export interface AnalyticsBreakdownItem {
  readonly label: string;
  readonly value: number;
}

/** A dimension broken down into its category values. */
export interface AnalyticsBreakdown {
  readonly dimension: string;
  readonly items: readonly AnalyticsBreakdownItem[];
}
