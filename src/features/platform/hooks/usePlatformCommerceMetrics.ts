/**
 * usePlatformCommerceMetrics hook (P64 Phase 4).
 *
 * The Platform Owner's checkout read: orders by status, the manual-payment
 * review backlog and approval latency, refunds, and paid revenue per
 * currency — all over a trailing `days` window (1–90). Keyed by `days` so
 * each window is cached separately and switching back is instant.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformMetricsKeys } from '@services/query';
import { platformMetricsService } from '../services/PlatformMetricsService';
import type { PlatformCommerceMetrics } from '@types';
import type { ApiError } from '@api';

export function usePlatformCommerceMetrics(days: number) {
  return useApiQuery<PlatformCommerceMetrics, ApiError>({
    queryKey: platformMetricsKeys.commerce(days),
    queryFn: () => platformMetricsService.getCommerceOverview(days),
  });
}
