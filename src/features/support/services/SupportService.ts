/**
 * Support Service.
 *
 * Platform-wide, cross-tenant, flat resource — same shape as
 * `PlatformProvisioningService`. `updateStatus`/`postReply` are the only
 * writes; there is no case-creation or agent-assignment mutation because
 * the product specification defines none.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { toCollectionParams } from '@api';
import type {
  CollectionQuery,
  CreateSupportCasePayload,
  PaginatedResult,
  PostSupportCaseReplyPayload,
  SupportCaseDetail,
  SupportCaseSummary,
  UpdateSupportCaseStatusPayload,
} from '@types';

export class SupportService extends BaseService {
  protected readonly resource = 'support-cases';

  async getCases(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<SupportCaseSummary>> {
    return this.fetchCollection<SupportCaseSummary>(query, options);
  }

  async getCase(
    caseId: string,
    options?: ReadOptions
  ): Promise<SupportCaseDetail> {
    return this.fetchOne<SupportCaseDetail>(caseId, options);
  }

  async updateStatus(
    caseId: string,
    payload: UpdateSupportCaseStatusPayload,
    options?: WriteOptions
  ): Promise<SupportCaseDetail> {
    return this.client.patch<SupportCaseDetail, UpdateSupportCaseStatusPayload>(
      this.path(caseId, 'status'),
      payload,
      options
    );
  }

  async postReply(
    caseId: string,
    payload: PostSupportCaseReplyPayload,
    options?: WriteOptions
  ): Promise<SupportCaseDetail> {
    return this.client.post<SupportCaseDetail, PostSupportCaseReplyPayload>(
      this.path(caseId, 'messages'),
      payload,
      options
    );
  }
}

/**
 * My Support Service — the TENANT side.
 *
 * Deliberately a separate service from `SupportService` above, which is
 * Platform-Owner-only and hits flat, cross-tenant routes. Reusing it for
 * tenant calls would point a customer's request at `/support-cases/:id`,
 * which they are correctly refused from — the tenant routes are
 * `/support-cases/mine/...` and are scoped to the caller by RLS.
 *
 * Creation is organization-scoped (`organizations/:id/support-cases`)
 * because that is where the ticket's tenant context comes from; reading
 * and replying are not, because a ticket belongs to the PERSON who filed
 * it, not to whichever organization they happen to be viewing.
 */
export class MySupportService extends BaseService {
  protected readonly resource = 'support-cases';

  /** Files a new ticket against an organization the caller belongs to. */
  async createCase(
    organizationId: string,
    payload: CreateSupportCasePayload,
    options?: WriteOptions
  ): Promise<SupportCaseDetail> {
    return this.client.post<SupportCaseDetail, CreateSupportCasePayload>(
      `/organizations/${organizationId}/support-cases`,
      payload,
      options
    );
  }

  /** Lists the caller's own tickets. */
  async getMyCases(
    organizationId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<SupportCaseSummary>> {
    return this.client.get<PaginatedResult<SupportCaseSummary>>(
      `/organizations/${organizationId}/support-cases`,
      {
        ...options,
        params: { ...options?.params, ...toCollectionParams(query) },
      }
    );
  }

  /** Reads one of the caller's own tickets, with its full conversation. */
  async getMyCase(
    caseId: string,
    options?: ReadOptions
  ): Promise<SupportCaseDetail> {
    return this.client.get<SupportCaseDetail>(
      `/support-cases/mine/${caseId}`,
      options
    );
  }

  /** Adds the caller's reply to their own ticket. */
  async replyToMyCase(
    caseId: string,
    payload: PostSupportCaseReplyPayload,
    options?: WriteOptions
  ): Promise<SupportCaseDetail> {
    return this.client.post<SupportCaseDetail, PostSupportCaseReplyPayload>(
      `/support-cases/mine/${caseId}/messages`,
      payload,
      options
    );
  }
}

export const supportService = new SupportService();
export const mySupportService = new MySupportService();
