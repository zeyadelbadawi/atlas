/**
 * Plan Service.
 *
 * The Plan/Add-on catalog is NOT tenant-scoped — it's the same list for
 * every customer, so unlike `TenantService` nothing here takes an
 * `organizationId`. The Add-on catalog is exposed from this service (via a
 * manually-built path, the same pattern `AnnouncementService` already uses
 * for a related-but-differently-scoped resource) rather than a fourth
 * service, since a standalone `AddOnService` would only ever hold two
 * read methods.
 *
 * The Trial Policy (Atlas Platform Owner configuration — see `TrialPolicy`)
 * lives here too, for the same reason: it's platform-catalog-scoped, not
 * tenant-scoped, and a standalone `PlatformConfigService` would exist only
 * to hold two methods for one settings resource. Unlike the rest of this
 * service, `updateTrialPolicy` IS a write — it configures Atlas-wide policy,
 * not a purchase/payment, so it doesn't fall under `TenantService`'s
 * "read-only, no payment provider" boundary.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath } from '@api';
import type { AddOn, Plan, TrialPolicy } from '@types';

export class PlanService extends BaseService {
  protected readonly resource = 'plans';

  /**
   * Retrieves the plan catalog.
   *
   * Phase 4.5.3 (scalability, Change 4) — the backend endpoint is now
   * paginated (`ATLAS_SCALABILITY_PHASE_4_5_3_REPORT.md`); this method's
   * own signature is deliberately left unchanged (`readonly Plan[]`, not
   * a `PaginatedResult`) so every existing caller (`usePlanCatalog` and,
   * through it, `PlansPage`/`TenantUsagePage`/`TenantSubscriptionPage`/
   * `PlatformPlanCatalogPage`) needs no change — none of them page
   * through the catalog; they render a full comparison view, which a
   * real production catalog (a handful of plans) always fits in one
   * request. `pageSize: 100` is the backend's own maximum allowed page
   * size — comfortably above any real catalog, while no longer capable of
   * forcing a browser to render an unbounded number of rows the way the
   * unpaginated endpoint could (reproduced and documented in Phase 4.5:
   * thousands of accumulated dev/test fixture rows hung the real Plans
   * page in a real browser).
   */
  async getPlans(options?: ReadOptions): Promise<readonly Plan[]> {
    const result = await this.fetchCollection<Plan>(
      { pagination: { page: 1, pageSize: 100 } },
      options
    );
    return result.items;
  }

  /** Retrieves a single plan by its stable key. */
  async getPlan(key: string, options?: ReadOptions): Promise<Plan> {
    return this.client.get<Plan>(this.path(key), options);
  }

  /** Retrieves every add-on in the catalog. */
  async getAddOns(options?: ReadOptions): Promise<readonly AddOn[]> {
    return this.client.get<readonly AddOn[]>(resourcePath('add-ons'), options);
  }

  /** Retrieves a single add-on by its stable key. */
  async getAddOn(key: string, options?: ReadOptions): Promise<AddOn> {
    return this.client.get<AddOn>(resourcePath('add-ons', key), options);
  }

  /**
   * Retrieves the Atlas Platform Owner's current trial policy
   * (enabled/disabled + configured duration).
   */
  async getTrialPolicy(options?: ReadOptions): Promise<TrialPolicy> {
    return this.client.get<TrialPolicy>(resourcePath('trial-policy'), options);
  }

  /**
   * Updates the trial policy. Platform Owner only — enforced by
   * `RouteGuard`/navigation on the consuming page, and ultimately by the
   * backend, never by this method itself.
   */
  async updateTrialPolicy(
    payload: TrialPolicy,
    options?: WriteOptions
  ): Promise<TrialPolicy> {
    return this.client.patch<TrialPolicy, TrialPolicy>(
      resourcePath('trial-policy'),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const planService = new PlanService();
