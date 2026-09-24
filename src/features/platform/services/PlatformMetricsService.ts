/**
 * Platform Metrics Service.
 *
 * The Platform Command Center's metrics snapshot is a singleton (like
 * `PlanService.getTrialPolicy`) — there is exactly one current snapshot,
 * never a collection of them.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  PlatformCommerceMetrics,
  PlatformDeliveryMetrics,
  PlatformMetricsOverview,
  PlatformVideoMetrics,
} from '@types';

export class PlatformMetricsService extends BaseService {
  protected readonly resource = 'platform-metrics';

  async getOverview(options?: ReadOptions): Promise<PlatformMetricsOverview> {
    return this.client.get<PlatformMetricsOverview>(this.path(), options);
  }

  /** P64 Phase 4 §E.5 — video minutes per tier, assets per provider, processing health. */
  async getVideoOverview(options?: ReadOptions): Promise<PlatformVideoMetrics> {
    return this.client.get<PlatformVideoMetrics>(this.path('video'), options);
  }

  /** P64 Phase 4 — orders, approvals, refunds and paid revenue over `days` (1–90). */
  async getCommerceOverview(
    days: number,
    options?: ReadOptions
  ): Promise<PlatformCommerceMetrics> {
    return this.client.get<PlatformCommerceMetrics>(this.path('commerce'), {
      ...options,
      params: { ...options?.params, days },
    });
  }

  /** P64 Phase 4 — content grants, video inventory and retention lag over `days` (1–90). */
  async getDeliveryOverview(
    days: number,
    options?: ReadOptions
  ): Promise<PlatformDeliveryMetrics> {
    return this.client.get<PlatformDeliveryMetrics>(this.path('delivery'), {
      ...options,
      params: { ...options?.params, days },
    });
  }
}

export const platformMetricsService = new PlatformMetricsService();
