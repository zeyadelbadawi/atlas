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
  PlatformGrowthMetrics,
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

  /** B0-ANL-04 — weekly activation funnel by signup cohort (1–26 weeks), internal organizations excluded. */
  async getGrowthOverview(
    weeks: number,
    options?: ReadOptions
  ): Promise<PlatformGrowthMetrics> {
    return this.client.get<PlatformGrowthMetrics>(this.path('growth'), {
      ...options,
      params: { ...options?.params, weeks },
    });
  }
}

export const platformMetricsService = new PlatformMetricsService();
