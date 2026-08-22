/**
 * useAcademyActivity hook.
 *
 * Fetches academy activity using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import { academyService } from '../services/AcademyService';
import type {
  AcademyActivity,
  CollectionQuery,
  PaginatedResult,
} from '@types';

export interface UseAcademyActivityOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useAcademyActivity(
  academyId: string,
  options?: UseAcademyActivityOptions
) {
  const { query, enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<PaginatedResult<AcademyActivity>>({
    queryKey: academyKeys.activity(organization?.id, academyId, query),
    queryFn: () => academyService.getAcademyActivity(academyId, query),
    enabled: enabled && !!academyId,
  });
}