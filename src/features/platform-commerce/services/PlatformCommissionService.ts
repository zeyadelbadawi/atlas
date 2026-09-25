/**
 * Platform Commission Service.
 *
 * `/platform-commission/*` — the §4.2 three-tier hierarchy (organization
 * override → plan → global default). The ONLY place any commission value
 * can be written; an Organization has no route that reaches these writes.
 * `PlatformOwnerGuard`-gated server-side.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  AtlasCommissionConfig,
  OrganizationCommission,
  PlanCommission,
  UpdateAtlasCommissionConfigPayload,
  UpdateOrganizationCommissionPayload,
  UpdatePlanCommissionPayload,
} from '@types';

export class PlatformCommissionService extends BaseService {
  protected readonly resource = 'platform-commission';

  async getGlobal(options?: ReadOptions): Promise<AtlasCommissionConfig> {
    return this.client.get<AtlasCommissionConfig>(this.path('global'), options);
  }

  async updateGlobal(
    payload: UpdateAtlasCommissionConfigPayload,
    options?: WriteOptions
  ): Promise<AtlasCommissionConfig> {
    return this.client.patch<
      AtlasCommissionConfig,
      UpdateAtlasCommissionConfigPayload
    >(this.path('global'), payload, options);
  }

  /** Addressed by plan KEY, not id — matches every other plan-scoped route. */
  async getPlan(
    planKey: string,
    options?: ReadOptions
  ): Promise<PlanCommission> {
    return this.client.get<PlanCommission>(
      this.path('plans', planKey),
      options
    );
  }

  async updatePlan(
    planKey: string,
    payload: UpdatePlanCommissionPayload,
    options?: WriteOptions
  ): Promise<PlanCommission> {
    return this.client.patch<PlanCommission, UpdatePlanCommissionPayload>(
      this.path('plans', planKey),
      payload,
      options
    );
  }

  async getOrganization(
    organizationId: string,
    options?: ReadOptions
  ): Promise<OrganizationCommission> {
    return this.client.get<OrganizationCommission>(
      this.path('organizations', organizationId),
      options
    );
  }

  async updateOrganization(
    organizationId: string,
    payload: UpdateOrganizationCommissionPayload,
    options?: WriteOptions
  ): Promise<OrganizationCommission> {
    return this.client.patch<
      OrganizationCommission,
      UpdateOrganizationCommissionPayload
    >(this.path('organizations', organizationId), payload, options);
  }
}

export const platformCommissionService = new PlatformCommissionService();
