/**
 * useAcademyStudents hook (P64 Phase 1).
 *
 * Fetches one page of the academy's learner roster. Filtering, sorting
 * and paging are all server-side — the query object is embedded in the
 * key so every distinct filter combination is its own cache entry.
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiQuery, useAuth } from '@/shared/hooks';
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
    // Typing in the search box or flipping a filter keeps the previous
    // rows on screen instead of collapsing the table to a skeleton.
    placeholderData: keepPreviousData,
  });
}
