/**
 * Tenant Support Case Service (Phase 8).
 *
 * The customer's own side of Support: submit a ticket, and track the
 * tickets you submitted. Deliberately separate from the Platform
 * Operations `SupportService` (the agent-facing console) — same
 * `SupportCase` rows, but a different, narrower surface: a tenant may
 * only ever create a ticket as themselves and read back tickets they
 * personally requested, which the backend enforces with its own RLS
 * policies, not with a client-side filter.
 *
 * Two route pairs mirroring the backend exactly: `organizations/:id/...`
 * for an Organization Owner (no single Academy), `academies/:id/...` for
 * an Academy Manager (scoped to the academy they manage). Scope always
 * comes from the route, never from the request body.
 */
import { BaseService, resourcePath } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CreateSupportCasePayload,
  PaginatedResult,
  SupportCaseDetail,
  SupportCaseSummary,
} from '@types';

export class TenantSupportCaseService extends BaseService {
  protected readonly resource = 'organizations';

  async createForOrganization(
    organizationId: string,
    payload: CreateSupportCasePayload,
    options?: WriteOptions
  ): Promise<SupportCaseDetail> {
    return this.client.post<SupportCaseDetail, CreateSupportCasePayload>(
      resourcePath('organizations', organizationId, 'support-cases'),
      payload,
      options
    );
  }

  async createForAcademy(
    academyId: string,
    payload: CreateSupportCasePayload,
    options?: WriteOptions
  ): Promise<SupportCaseDetail> {
    return this.client.post<SupportCaseDetail, CreateSupportCasePayload>(
      resourcePath('academies', academyId, 'support-cases'),
      payload,
      options
    );
  }

  /** The caller's OWN tickets — the backend scopes this to the authenticated requester; it is never a list of the organization's tickets. */
  async listMineForOrganization(
    organizationId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<SupportCaseSummary>> {
    return this.client.get<PaginatedResult<SupportCaseSummary>>(
      resourcePath('organizations', organizationId, 'support-cases'),
      options
    );
  }

  /** See `listMineForOrganization` — same "your own tickets only" rule. */
  async listMineForAcademy(
    academyId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<SupportCaseSummary>> {
    return this.client.get<PaginatedResult<SupportCaseSummary>>(
      resourcePath('academies', academyId, 'support-cases'),
      options
    );
  }
}

export const tenantSupportCaseService = new TenantSupportCaseService();
