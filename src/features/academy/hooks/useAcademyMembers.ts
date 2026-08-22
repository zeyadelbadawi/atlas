/**
 * useAcademyMembers hook.
 *
 * Fetches academy members using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import { academyService } from '../services/AcademyService';
import type { AcademyMember, CollectionQuery, PaginatedResult } from '@types';

export interface UseAcademyMembersOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useAcademyMembers(
  academyId: string,
  options?: UseAcademyMembersOptions
) {
  const { query, enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<PaginatedResult<AcademyMember>>({
    queryKey: academyKeys.members(organization?.id, academyId, query),
    queryFn: () => academyService.getAcademyMembers(academyId, query),
    enabled: enabled && !!academyId,
  });
}