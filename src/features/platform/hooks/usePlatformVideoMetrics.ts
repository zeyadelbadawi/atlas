/**
 * usePlatformVideoMetrics hook (P64 Phase 4 §E.5).
 *
 * The Platform Owner's video-minutes / provider-health read. Kept separate
 * from `usePlatformMetrics` because it answers a different endpoint whose
 * response is deliberately not part of the fixed seven-KPI overview.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformMetricsKeys } from '@services/query';
import { platformMetricsService } from '../services/PlatformMetricsService';
import type { PlatformVideoMetrics } from '@types';
import type { ApiError } from '@api';

export function usePlatformVideoMetrics() {
  return useApiQuery<PlatformVideoMetrics, ApiError>({
    queryKey: platformMetricsKeys.video(),
    queryFn: () => platformMetricsService.getVideoOverview(),
  });
}
