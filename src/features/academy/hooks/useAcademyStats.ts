/**
 * useAcademyStats hook.
 *
 * Fetches academy statistics using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import { academyKeys } from '@services/query';
import { academyService } from '../services/AcademyService';
import type { AcademyStats } from '@types';

export interface UseAcademyStatsOptions {
  readonly enabled?: boolean;
}

export function useAcademyStats(
  academyId: string,
  options?: UseAcademyStatsOptions
) {
  const { enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<AcademyStats>({
    queryKey: academyKeys.stats(organization?.id, academyId),
    queryFn: () => academyService.getAcademyStats(academyId),
    enabled: enabled && !!academyId,
    // Counts move when other people act (registrations, enrollments).
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}
