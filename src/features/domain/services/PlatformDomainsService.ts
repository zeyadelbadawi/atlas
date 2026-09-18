/**
 * PlatformDomainsService (P63) — the Platform Owner's cross-tenant domain
 * operations: `platform-domains` (a flat hyphenated resource, because
 * `BaseService.resourcePath()` percent-encodes every segment).
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CollectionQuery,
  PaginatedResult,
  PlatformDomainRow,
  PlatformDomainsOverview,
} from '@types';

export class PlatformDomainsService extends BaseService {
  protected readonly resource = 'platform-domains';

  async list(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformDomainRow>> {
    return this.fetchCollection<PlatformDomainRow>(query, options);
  }

  async getOverview(options?: ReadOptions): Promise<PlatformDomainsOverview> {
    return this.client.get<PlatformDomainsOverview>(
      this.path('overview'),
      options
    );
  }

  async getRow(
    academyId: string,
    options?: ReadOptions
  ): Promise<PlatformDomainRow> {
    return this.fetchOne<PlatformDomainRow>(academyId, options);
  }

  /** P63g — operator release: frees a hostname an Academy is holding (typically archived) so it can be connected elsewhere. */
  async release(academyId: string): Promise<PlatformDomainRow> {
    return this.client.delete<PlatformDomainRow>(
      this.path(academyId, 'custom-domain')
    );
  }

  /** Operator-triggered re-check — same server-side check the customer's "Check now" runs, audited with the operator as actor. */
  async check(
    academyId: string,
    options?: WriteOptions
  ): Promise<PlatformDomainRow> {
    return this.client.post<PlatformDomainRow, undefined>(
      this.path(academyId, 'check'),
      undefined,
      options
    );
  }
}

export const platformDomainsService = new PlatformDomainsService();
