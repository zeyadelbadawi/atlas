/**
 * usePlatformMetrics hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformMetricsKeys } from '@services/query';
import { platformMetricsService } from '../services/PlatformMetricsService';
import type { PlatformMetricsOverview } from '@types';
import type { ApiError } from '@api';

export function usePlatformMetrics() {
  return useApiQuery<PlatformMetricsOverview, ApiError>({
    queryKey: platformMetricsKeys.overview(),
    queryFn: () => platformMetricsService.getOverview(),
  });
}
