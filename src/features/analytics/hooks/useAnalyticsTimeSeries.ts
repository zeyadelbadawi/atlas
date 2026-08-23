/**
 * useAnalyticsTimeSeries hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { analyticsKeys } from '@services/query';
import { analyticsService } from '../services/AnalyticsService';
import type { AnalyticsQuery, AnalyticsTimeSeries } from '@types';
import type { ApiError } from '@api';

export function useAnalyticsTimeSeries(metric: string, query?: AnalyticsQuery) {
  return useApiQuery<AnalyticsTimeSeries, ApiError>({
    queryKey: analyticsKeys.timeSeries(metric, query),
    queryFn: () => analyticsService.getTimeSeries(metric, query),
    enabled: !!metric,
  });
}
