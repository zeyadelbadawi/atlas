/**
 * useAuditLogEntries hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { auditLogKeys } from '@services/query';
import { auditLogService } from '../services/AuditLogService';
import type { AuditLogEntrySummary, CollectionQuery, PaginatedResult } from '@types';
import type { ApiError } from '@api';

export interface UseAuditLogEntriesOptions {
  readonly query?: CollectionQuery;
}

export function useAuditLogEntries(options?: UseAuditLogEntriesOptions) {
  return useApiQuery<PaginatedResult<AuditLogEntrySummary>, ApiError>({
    queryKey: auditLogKeys.list(options?.query),
    queryFn: () => auditLogService.getEntries(options?.query),
  });
}
