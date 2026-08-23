/**
 * Platform Organization Service (Prompt 13).
 *
 * The Platform Owner's cross-tenant organization console — a flat,
 * `organizations` resource, list-scoped (no existing service lists every
 * organization; every prior `organizations`-resourced service only ever
 * addresses the CALLER's own single organization via nested paths, so
 * this list verb introduces no ambiguity with them). Read-only: no
 * organization-administration mutation (suspend/edit/archive) is defined
 * by the product specification (see `platform-organization.types.ts`'s
 * doc comment).
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  CollectionQuery,
  PaginatedResult,
  PlatformOrganizationDetail,
  PlatformOrganizationSummary,
} from '@types';

export class PlatformOrganizationService extends BaseService {
  protected readonly resource = 'organizations';

  /** Retrieves organizations across the whole platform. */
  async getOrganizations(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformOrganizationSummary>> {
    return this.fetchCollection<PlatformOrganizationSummary>(query, options);
  }

  /** Retrieves one organization's full cross-tenant detail view. */
  async getOrganization(
    organizationId: string,
    options?: ReadOptions
  ): Promise<PlatformOrganizationDetail> {
    return this.fetchOne<PlatformOrganizationDetail>(organizationId, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformOrganizationService = new PlatformOrganizationService();
