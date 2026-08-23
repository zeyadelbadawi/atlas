/**
 * useAnalyticsOverview hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { analyticsKeys } from '@services/query';
import { analyticsService } from '../services/AnalyticsService';
import type { AnalyticsOverview, AnalyticsQuery } from '@types';
import type { ApiError } from '@api';

export function useAnalyticsOverview(query?: AnalyticsQuery) {
  return useApiQuery<AnalyticsOverview, ApiError>({
    queryKey: analyticsKeys.overview(query),
    queryFn: () => analyticsService.getOverview(query),
  });
}
