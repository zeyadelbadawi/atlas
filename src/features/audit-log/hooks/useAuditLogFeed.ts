/**
 * Cursor-feed hooks (Task 3) — infinite queries whose page param is the
 * server's opaque `nextCursor`. "Load more" calls `fetchNextPage`; a filter
 * change is a new query key, so it always starts again from the newest
 * entry rather than mixing pages from two different filter sets.
 */
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useApiQuery } from '@/shared/hooks';
import { auditLogKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  AuditFeedQuery,
  AuditLogCursorPage,
  AuditLogEntrySummary,
  PlatformAuditFeedQuery,
  TenantAuditLogEntry,
  TenantAuditLogEntryDetail,
} from '@types';
import {
  academyActivityLogService,
  auditLogService,
} from '../services/AuditLogService';

export const AUDIT_FEED_PAGE_SIZE = 25;

type FeedFilters<T> = Omit<T, 'cursor' | 'limit'>;

export interface UseAuditFeedOptions {
  readonly limit?: number;
  readonly enabled?: boolean;
}

/** The Platform Owner's cross-tenant feed. */
export function useAuditLogFeed(
  filters: FeedFilters<PlatformAuditFeedQuery> = {},
  options: UseAuditFeedOptions = {}
) {
  const limit = options.limit ?? AUDIT_FEED_PAGE_SIZE;
  return useInfiniteQuery<
    AuditLogCursorPage<AuditLogEntrySummary>,
    ApiError,
    InfiniteData<AuditLogCursorPage<AuditLogEntrySummary>, string | undefined>,
    ReturnType<typeof auditLogKeys.feed>,
    string | undefined
  >({
    queryKey: auditLogKeys.feed({ ...filters, limit }),
    queryFn: ({ pageParam }) =>
      auditLogService.getFeed({ ...filters, limit, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
  });
}

/** One academy's activity log (owner-only on the server). */
export function useAcademyActivityLog(
  academyId: string,
  filters: FeedFilters<AuditFeedQuery> = {},
  options: UseAuditFeedOptions = {}
) {
  const limit = options.limit ?? AUDIT_FEED_PAGE_SIZE;
  return useInfiniteQuery<
    AuditLogCursorPage<TenantAuditLogEntry>,
    ApiError,
    InfiniteData<AuditLogCursorPage<TenantAuditLogEntry>, string | undefined>,
    ReturnType<typeof auditLogKeys.academyFeed>,
    string | undefined
  >({
    queryKey: auditLogKeys.academyFeed(academyId, { ...filters, limit }),
    queryFn: ({ pageParam }) =>
      academyActivityLogService.getFeed(academyId, {
        ...filters,
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: (options.enabled ?? true) && !!academyId,
  });
}

/** One academy activity entry, with its before/after. */
export function useAcademyActivityEntry(
  academyId: string,
  entryId: string | undefined
) {
  return useApiQuery<TenantAuditLogEntryDetail, ApiError>({
    queryKey: auditLogKeys.academyEntry(academyId, entryId ?? ''),
    queryFn: () => academyActivityLogService.getEntry(academyId, entryId!),
    enabled: !!academyId && !!entryId,
  });
}
