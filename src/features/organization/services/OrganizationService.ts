/**
 * Organization Service.
 *
 * Reads the Organization/Tenant entity itself (`GET /organizations/:id`) —
 * distinct from `TenantService` (subscription/usage/add-ons) and
 * `PlatformOrganizationService` (the Platform Owner's cross-tenant view).
 *
 * Phase P19: `create` added — `POST /organizations` was entirely missing
 * (`Reports/DEVELOPMENT_E2E_FLOW_AUDIT.md` P0-1; this file's own prior
 * comment documented that gap explicitly). Update/delete remain
 * genuinely `SPECIFICATION-UNDEFINED` (see `Reports/PROGRESS.md`'s
 * Organization Management Completion entry) — out of P19's scope, which
 * is the new-Client onboarding journey specifically, not full org
 * settings management.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { CreateOrganizationPayload, Organization } from '@types';

export class OrganizationService extends BaseService {
  protected readonly resource = 'organizations';

  /** Retrieves one organization by id. The caller must have an active membership in it — enforced server-side (RLS + guard), never assumed client-side. */
  async getById(organizationId: string, options?: ReadOptions): Promise<Organization> {
    return this.fetchOne<Organization>(organizationId, options);
  }

  /** Creates a new Organization, owned by the caller — the caller becomes its first `owner`-role member server-side, atomically. */
  async create(
    payload: CreateOrganizationPayload,
    options?: WriteOptions
  ): Promise<Organization> {
    return this.createOne<Organization, CreateOrganizationPayload>(payload, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const organizationService = new OrganizationService();
