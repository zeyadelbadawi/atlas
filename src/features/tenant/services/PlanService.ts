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

  /** Retrieves every plan in the catalog. */
  async getPlans(options?: ReadOptions): Promise<readonly Plan[]> {
    return this.client.get<readonly Plan[]>(this.path(), options);
  }

  /** Retrieves a single plan by its stable key. */
  async getPlan(key: string, options?: ReadOptions): Promise<Plan> {
    return this.client.get<Plan>(this.path(key), options);
  }

  /** Retrieves every add-on in the catalog. */
  async getAddOns(options?: ReadOptions): Promise<readonly AddOn[]> {
    return this.client.get<readonly AddOn[]>(
      resourcePath('add-ons'),
      options
    );
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
