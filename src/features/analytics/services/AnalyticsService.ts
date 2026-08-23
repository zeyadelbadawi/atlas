/**
 * Analytics Service.
 *
 * Platform-wide analytics — not tenant-scoped. `getOverview` is a
 * singleton snapshot for the active date range (like
 * `PlatformMetricsService.getOverview`); `getTimeSeries`/`getBreakdown`
 * are read-only sub-resources keyed by metric/dimension name, using the
 * same `resourcePath(...)` pattern `PlanService` already uses for its
 * `add-ons`/`trial-policy` sub-resources.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import { resourcePath } from '@api';
import type {
  AnalyticsBreakdown,
  AnalyticsOverview,
  AnalyticsQuery,
  AnalyticsTimeSeries,
} from '@types';

function toParams(query?: AnalyticsQuery): Record<string, string> | undefined {
  if (!query?.dateRange) return undefined;
  return { from: query.dateRange.from, to: query.dateRange.to };
}

export class AnalyticsService extends BaseService {
  protected readonly resource = 'analytics';

  async getOverview(query?: AnalyticsQuery, options?: ReadOptions): Promise<AnalyticsOverview> {
    return this.client.get<AnalyticsOverview>(resourcePath('analytics', 'overview'), {
      ...options,
      params: { ...toParams(query), ...options?.params },
    });
  }

  async getTimeSeries(
    metric: string,
    query?: AnalyticsQuery,
    options?: ReadOptions
  ): Promise<AnalyticsTimeSeries> {
    return this.client.get<AnalyticsTimeSeries>(
      resourcePath('analytics', 'time-series', metric),
      { ...options, params: { ...toParams(query), ...options?.params } }
    );
  }

  async getBreakdown(
    dimension: string,
    query?: AnalyticsQuery,
    options?: ReadOptions
  ): Promise<AnalyticsBreakdown> {
    return this.client.get<AnalyticsBreakdown>(
      resourcePath('analytics', 'breakdown', dimension),
      { ...options, params: { ...toParams(query), ...options?.params } }
    );
  }
}

export const analyticsService = new AnalyticsService();
