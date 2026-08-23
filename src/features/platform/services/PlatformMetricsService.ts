/**
 * Platform Metrics Service.
 *
 * The Platform Command Center's metrics snapshot is a singleton (like
 * `PlanService.getTrialPolicy`) — there is exactly one current snapshot,
 * never a collection of them.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { PlatformMetricsOverview } from '@types';

export class PlatformMetricsService extends BaseService {
  protected readonly resource = 'platform-metrics';

  async getOverview(options?: ReadOptions): Promise<PlatformMetricsOverview> {
    return this.client.get<PlatformMetricsOverview>(this.path(), options);
  }
}

export const platformMetricsService = new PlatformMetricsService();
