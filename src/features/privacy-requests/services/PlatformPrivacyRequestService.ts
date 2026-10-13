/**
 * B0-SEC-13 — the Platform Owner's privacy-request queue. Flat hyphenated
 * resource (`platform-privacy-requests`): `path()` encodes each segment, so a
 * slashed resource name would 404. `PlatformOwnerGuard` + RLS are the real
 * control; the route guard only decides what is shown.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { PaginatedResult } from '@types';
import type {
  PlatformPrivacyRequest,
  PlatformPrivacyRequestListQuery,
} from '../types';

export class PlatformPrivacyRequestService extends BaseService {
  protected readonly resource = 'platform-privacy-requests';

  async list(
    query?: PlatformPrivacyRequestListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformPrivacyRequest>> {
    const params: Record<string, string | number> = {};
    if (query?.page) params.page = query.page;
    if (query?.pageSize) params.pageSize = query.pageSize;
    if (query?.status) params.status = query.status;
    if (query?.type) params.type = query.type;
    return this.client.get<PaginatedResult<PlatformPrivacyRequest>>(
      this.path(),
      { ...options, params: { ...params, ...options?.params } }
    );
  }

  async get(
    requestId: string,
    options?: ReadOptions
  ): Promise<PlatformPrivacyRequest> {
    return this.client.get<PlatformPrivacyRequest>(
      this.path(requestId),
      options
    );
  }

  async updateStatus(
    requestId: string,
    payload: {
      readonly status: 'in_progress' | 'rejected';
      readonly note?: string;
    }
  ): Promise<PlatformPrivacyRequest> {
    return this.client.post<PlatformPrivacyRequest, typeof payload>(
      this.path(requestId, 'status'),
      payload
    );
  }

  /** Export: opens the download window. Deletion: deletes the account. */
  async fulfil(requestId: string): Promise<PlatformPrivacyRequest> {
    return this.client.post<PlatformPrivacyRequest, { confirm: true }>(
      this.path(requestId, 'fulfil'),
      { confirm: true }
    );
  }
}

export const platformPrivacyRequestService =
  new PlatformPrivacyRequestService();
