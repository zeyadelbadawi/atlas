/**
 * Organization Service.
 *
 * Reads the Organization/Tenant entity itself (`GET /organizations/:id`) —
 * distinct from `TenantService` (subscription/usage/add-ons) and
 * `PlatformOrganizationService` (the Platform Owner's cross-tenant view).
 * Read-only: the backend does not yet expose an update/create/delete
 * capability for this resource (see Reports/PROGRESS.md's Organization
 * Management Completion entry — settings/membership-management remain
 * `SPECIFICATION-UNDEFINED`), so no write method is defined here.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { Organization } from '@types';

export class OrganizationService extends BaseService {
  protected readonly resource = 'organizations';

  /** Retrieves one organization by id. The caller must have an active membership in it — enforced server-side (RLS + guard), never assumed client-side. */
  async getById(organizationId: string, options?: ReadOptions): Promise<Organization> {
    return this.fetchOne<Organization>(organizationId, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const organizationService = new OrganizationService();
