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
import type {
  CollectionQuery,
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

  async getCase(caseId: string, options?: ReadOptions): Promise<SupportCaseDetail> {
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

export const supportService = new SupportService();
