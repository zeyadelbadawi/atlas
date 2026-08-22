/**
 * Tenant Service.
 *
 * Every method here is scoped by `organizationId` — the existing
 * Organization identity IS the Tenant boundary (see
 * `Reports/ARCHITECTURE.md`, Prompt 6). Nested under the existing
 * `organizations` resource, the same way `AcademyService` nests
 * members/stats/activity/branding under one academy.
 *
 * Read-only by design: Prompt 6 does not execute real plan changes or
 * add-on purchases (no payment provider exists), so no write method is
 * defined here. See `Reports/PROGRESS.md` for the documented backend
 * integration contract a future prompt will need to add.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { TenantAddOn, TenantSubscription, TenantUsage } from '@types';

export class TenantService extends BaseService {
  protected readonly resource = 'organizations';

  /** Retrieves the Tenant's (Organization's) current subscription. */
  async getSubscription(
    organizationId: string,
    options?: ReadOptions
  ): Promise<TenantSubscription> {
    return this.client.get<TenantSubscription>(
      this.path(organizationId, 'subscription'),
      options
    );
  }

  /** Retrieves the Tenant's current resource usage. */
  async getUsage(
    organizationId: string,
    options?: ReadOptions
  ): Promise<TenantUsage> {
    return this.client.get<TenantUsage>(
      this.path(organizationId, 'usage'),
      options
    );
  }

  /** Retrieves the Add-ons currently active on the Tenant's subscription. */
  async getActiveAddOns(
    organizationId: string,
    options?: ReadOptions
  ): Promise<readonly TenantAddOn[]> {
    return this.client.get<readonly TenantAddOn[]>(
      this.path(organizationId, 'add-ons'),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const tenantService = new TenantService();
