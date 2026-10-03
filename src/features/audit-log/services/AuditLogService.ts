/**
 * Audit Log services.
 *
 * `AuditLogService` — the Platform Owner's flat, cross-tenant resource
 * (`audit-log`): the offset list kept for compatibility, the cursor `feed`
 * the audit pages now use, and one entry's detail.
 *
 * `AcademyActivityLogService` — an Academy owner's activity log
 * (`academies/:academyId/activity`), cursor-paginated, tenant-scoped and
 * owner-only on the server.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  AuditFeedQuery,
  AuditLogCursorPage,
  AuditLogEntryDetail,
  AuditLogEntrySummary,
  CollectionQuery,
  PaginatedResult,
  PlatformAuditFeedQuery,
  TenantAuditLogEntry,
  TenantAuditLogEntryDetail,
} from '@types';

/** Drops empty values so the URL carries only the filters actually set. */
function toFeedParams(
  query: AuditFeedQuery | PlatformAuditFeedQuery | undefined
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = value as string | number;
  }
  return params;
}

export class AuditLogService extends BaseService {
  protected readonly resource = 'audit-log';

  async getEntries(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AuditLogEntrySummary>> {
    return this.fetchCollection<AuditLogEntrySummary>(query, options);
  }

  /** Keyset-paginated feed — `{ items, nextCursor }`, no total. */
  async getFeed(
    query?: PlatformAuditFeedQuery,
    options?: ReadOptions
  ): Promise<AuditLogCursorPage<AuditLogEntrySummary>> {
    return this.client.get<AuditLogCursorPage<AuditLogEntrySummary>>(
      this.path('feed'),
      { ...options, params: { ...toFeedParams(query), ...options?.params } }
    );
  }

  async getEntry(
    eventId: string,
    options?: ReadOptions
  ): Promise<AuditLogEntryDetail> {
    return this.fetchOne<AuditLogEntryDetail>(eventId, options);
  }
}

export class AcademyActivityLogService extends BaseService {
  protected readonly resource = 'academies';

  async getFeed(
    academyId: string,
    query?: AuditFeedQuery,
    options?: ReadOptions
  ): Promise<AuditLogCursorPage<TenantAuditLogEntry>> {
    return this.client.get<AuditLogCursorPage<TenantAuditLogEntry>>(
      this.path(academyId, 'activity'),
      { ...options, params: { ...toFeedParams(query), ...options?.params } }
    );
  }

  async getEntry(
    academyId: string,
    entryId: string,
    options?: ReadOptions
  ): Promise<TenantAuditLogEntryDetail> {
    return this.client.get<TenantAuditLogEntryDetail>(
      this.path(academyId, 'activity', entryId),
      options
    );
  }
}

export const auditLogService = new AuditLogService();
export const academyActivityLogService = new AcademyActivityLogService();
