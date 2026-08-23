/**
 * useAnalyticsBreakdown hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { analyticsKeys } from '@services/query';
import { analyticsService } from '../services/AnalyticsService';
import type { AnalyticsBreakdown, AnalyticsQuery } from '@types';
import type { ApiError } from '@api';

export function useAnalyticsBreakdown(dimension: string, query?: AnalyticsQuery) {
  return useApiQuery<AnalyticsBreakdown, ApiError>({
    queryKey: analyticsKeys.breakdown(dimension, query),
    queryFn: () => analyticsService.getBreakdown(dimension, query),
    enabled: !!dimension,
  });
}
