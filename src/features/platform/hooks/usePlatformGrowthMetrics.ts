/**
 * usePlatformGrowthMetrics hook (B0-ANL-04 part 3).
 *
 * The Platform Owner's read-only activation funnel by signup week, from
 * server truth. Keyed by `weeks` so each window is cached separately.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformMetricsKeys } from '@services/query';
import { platformMetricsService } from '../services/PlatformMetricsService';
import type { PlatformGrowthMetrics } from '@types';
import type { ApiError } from '@api';

export function usePlatformGrowthMetrics(weeks: number) {
  return useApiQuery<PlatformGrowthMetrics, ApiError>({
    queryKey: platformMetricsKeys.growth(weeks),
    queryFn: () => platformMetricsService.getGrowthOverview(weeks),
  });
}
