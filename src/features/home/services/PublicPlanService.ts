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
  // `path()` encodes `resource` as ONE segment (`resourcePath` runs
  // `encodeURIComponent` per segment before joining) — a resource
  // containing its own `/` would have that slash percent-encoded
  // (`public%2Fplans`, a real 404 against this exact endpoint,
  // confirmed live). `resource` stays a single segment; `plans` is
  // passed as its own segment to `path()` below instead.
  protected readonly resource = 'public';

  /** Retrieves the customer-facing plan catalog, no authentication required. */
  async getPlans(options?: ReadOptions): Promise<readonly Plan[]> {
    return this.client.get<readonly Plan[]>(this.path('plans'), options);
  }
}

export const publicPlanService = new PublicPlanService();
