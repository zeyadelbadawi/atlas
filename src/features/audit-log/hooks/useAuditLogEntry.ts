/**
 * useAuditLogEntry hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { auditLogKeys } from '@services/query';
import { auditLogService } from '../services/AuditLogService';
import type { AuditLogEntryDetail } from '@types';
import type { ApiError } from '@api';

export function useAuditLogEntry(eventId: string) {
  return useApiQuery<AuditLogEntryDetail, ApiError>({
    queryKey: auditLogKeys.detail(eventId),
    queryFn: () => auditLogService.getEntry(eventId),
    enabled: !!eventId,
  });
}
