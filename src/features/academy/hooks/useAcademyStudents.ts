/**
 * useAcademyStudents hook (P64 Phase 1).
 *
 * Fetches one page of the academy's learner roster. Filtering, sorting
 * and paging are all server-side — the query object is embedded in the
 * key so every distinct filter combination is its own cache entry.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyRosterService } from '../services/AcademyRosterService';
import type { AcademyRosterPage, AcademyRosterQuery } from '@types';

export interface UseAcademyStudentsOptions {
  readonly query?: AcademyRosterQuery;
  readonly enabled?: boolean;
}

export function useAcademyStudents(
  academyId: string,
  options?: UseAcademyStudentsOptions
) {
  const { query, enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<AcademyRosterPage, ApiError>({
    queryKey: academyKeys.roster(organization?.id, academyId, query),
    queryFn: () => academyRosterService.getStudents(academyId, query),
    enabled: enabled && !!academyId,
    // No `placeholderData` override: `useApiQuery`'s key-aware default
    // keeps the previous rows while search, filters or the page change,
    // and drops them when the academy changes (another academy's
    // learners must never show under this one).
    // Learners register, accept invites and enroll from their own
    // browsers; poll while shown (paused in background tabs).
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}
