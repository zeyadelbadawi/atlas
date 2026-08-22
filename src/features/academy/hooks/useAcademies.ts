/**
 * useAcademies hook.
 *
 * Fetches all academies for the active organization using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import { academyService } from '../services/AcademyService';
import type { Academy, CollectionQuery, PaginatedResult } from '@types';

export interface UseAcademiesOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useAcademies(options?: UseAcademiesOptions) {
  const { query, enabled = true } = options ?? {};
  // `organization` (not PlatformProvider's activeOrganizationId, which is only
  // populated after an explicit switch) is the session's real active
  // organization; embedding its id in the query key means TanStack Query
  // refetches automatically when the user switches organizations.
  const { organization } = useAuth();

  return useApiQuery<PaginatedResult<Academy>>({
    queryKey: academyKeys.list(organization?.id, query),
    queryFn: () => academyService.getAcademies(query),
    enabled: enabled && !!organization?.id,
  });
}