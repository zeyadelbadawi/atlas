/**
 * Audit Log Service.
 *
 * Platform-wide, cross-tenant, flat resource — same shape as
 * `PlatformProvisioningService`.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { AuditLogEntryDetail, AuditLogEntrySummary, CollectionQuery, PaginatedResult } from '@types';

export class AuditLogService extends BaseService {
  protected readonly resource = 'audit-log';

  async getEntries(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AuditLogEntrySummary>> {
    return this.fetchCollection<AuditLogEntrySummary>(query, options);
  }

  async getEntry(eventId: string, options?: ReadOptions): Promise<AuditLogEntryDetail> {
    return this.fetchOne<AuditLogEntryDetail>(eventId, options);
  }
}

export const auditLogService = new AuditLogService();
