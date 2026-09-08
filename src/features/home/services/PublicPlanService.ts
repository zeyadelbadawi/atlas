/**
 * Public Plan Service.
 *
 * Reads the same real Plan catalog `PlanService` does, but from
 * `GET /public/plans` — the one unauthenticated variant, meant for the
 * platform marketing site (a visitor has no session yet). Never a second,
 * parallel data source: same `Plan` shape, same backend catalog, only a
 * different, guard-free route (`PublicPlansController`).
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { Plan } from '@types';

export class PublicPlanService extends BaseService {
  protected readonly resource = 'public/plans';

  /** Retrieves the customer-facing plan catalog, no authentication required. */
  async getPlans(options?: ReadOptions): Promise<readonly Plan[]> {
    return this.client.get<readonly Plan[]>(this.path(), options);
  }
}

export const publicPlanService = new PublicPlanService();
