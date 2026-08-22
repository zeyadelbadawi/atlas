/**
 * Analytics types.
 *
 * Types for platform analytics, metrics, charts, and reporting.
 */

/** Time range for analytics queries. */
export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';

/** Metric aggregation type. */
export type MetricAggregation = 'sum' | 'avg' | 'min' | 'max' | 'count';

/** Chart type for visualization. */
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'donut';

/** A single data point in a time series. */
export interface TimeSeriesDataPoint {
  readonly timestamp: string;
  readonly value: number;
  readonly label?: string;
}

/** Time series data for a metric. */
export interface TimeSeriesData {
  readonly metricKey: string;
  readonly data: readonly TimeSeriesDataPoint[];
  readonly aggregation: MetricAggregation;
}

/** A platform-level metric. */
export interface PlatformMetric {
  /** Translation key for the metric name. */
  readonly labelKey: string;
  readonly value: number;
  readonly formattedValue: string;
  readonly previousValue?: number;
  readonly changePercent?: number;
  readonly trend?: 'up' | 'down' | 'flat';
  readonly unit?: string;
}

/** Analytics dashboard configuration. */
export interface AnalyticsDashboard {
  readonly id: string;
  /** Translation key for the dashboard name. */
  readonly nameKey: string;
  readonly widgets: readonly AnalyticsWidget[];
  readonly timeRange: AnalyticsTimeRange;
}

/** A dashboard widget. */
export interface AnalyticsWidget {
  readonly id: string;
  readonly type: 'metric' | 'chart' | 'table' | 'map';
  /** Translation key for the widget title. */
  readonly titleKey: string;
  readonly metric?: PlatformMetric;
  readonly chartData?: TimeSeriesData;
  readonly chartType?: ChartType;
  readonly size: 'small' | 'medium' | 'large' | 'full';
}

/** Analytics filter options. */
export interface AnalyticsFilters {
  readonly timeRange: AnalyticsTimeRange;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly groupBy?: 'day' | 'week' | 'month';
  readonly organizationId?: string;
}

/** Platform overview statistics. */
export interface PlatformStatistics {
  readonly totalAcademies: number;
  readonly activeAcademies: number;
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly totalRevenue: number;
  readonly currency: string;
  readonly metrics: readonly PlatformMetric[];
}

/** Chart data point for general use. */
export interface ChartDataPoint {
  readonly name: string;
  readonly value: number;
  readonly [key: string]: string | number;
}