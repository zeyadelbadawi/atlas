/**
 * useAcademyIntegrityReport / useAcademySharingReport (P64 Phase 4 §E.5).
 *
 * One query each, keyed by academy AND window (`academyReportKeys`), so
 * changing the window selector is a different query rather than a refetch
 * of the same key — and a 90-day answer is never shown under a 7-day label.
 *
 * Both are disabled until the page has an academy id from the route; the
 * page renders its own honest empty state in that case rather than calling
 * an endpoint with an empty segment.
 */
import { useApiQuery } from '@/shared/hooks';
import { academyReportKeys } from '@services/query';
import { academyReportsService } from '../services/AcademyReportsService';
import type { AcademyIntegrityReport, AcademySharingReport } from '@types';
import type { ApiError } from '@api';

export function useAcademyIntegrityReport(academyId: string, days: number) {
  return useApiQuery<AcademyIntegrityReport, ApiError>({
    queryKey: academyReportKeys.integrity(academyId || undefined, days),
    queryFn: () => academyReportsService.getIntegrityReport(academyId, days),
    enabled: academyId.length > 0,
  });
}

export function useAcademySharingReport(academyId: string, days: number) {
  return useApiQuery<AcademySharingReport, ApiError>({
    queryKey: academyReportKeys.sharing(academyId || undefined, days),
    queryFn: () => academyReportsService.getSharingReport(academyId, days),
    enabled: academyId.length > 0,
  });
}
