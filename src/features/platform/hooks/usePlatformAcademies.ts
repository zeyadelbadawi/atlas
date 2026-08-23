/**
 * usePlatformAcademies hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformAcademyKeys } from '@services/query';
import { platformAcademyService } from '../services/PlatformAcademyService';
import type { CollectionQuery, PaginatedResult, PlatformAcademySummary } from '@types';
import type { ApiError } from '@api';

export interface UsePlatformAcademiesOptions {
  readonly query?: CollectionQuery;
}

export function usePlatformAcademies(options?: UsePlatformAcademiesOptions) {
  return useApiQuery<PaginatedResult<PlatformAcademySummary>, ApiError>({
    queryKey: platformAcademyKeys.list(options?.query),
    queryFn: () => platformAcademyService.getAcademies(options?.query),
  });
}
