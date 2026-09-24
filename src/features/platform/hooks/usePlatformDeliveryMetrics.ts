/**
 * usePlatformDeliveryMetrics hook (P64 Phase 4).
 *
 * The Platform Owner's content-delivery read: grants granted vs refused
 * (with the refusal reasons), the video inventory and processing health,
 * and retention lag — over a trailing `days` window (1–90).
 */
import { useApiQuery } from '@/shared/hooks';
import { platformMetricsKeys } from '@services/query';
import { platformMetricsService } from '../services/PlatformMetricsService';
import type { PlatformDeliveryMetrics } from '@types';
import type { ApiError } from '@api';

export function usePlatformDeliveryMetrics(days: number) {
  return useApiQuery<PlatformDeliveryMetrics, ApiError>({
    queryKey: platformMetricsKeys.delivery(days),
    queryFn: () => platformMetricsService.getDeliveryOverview(days),
  });
}
