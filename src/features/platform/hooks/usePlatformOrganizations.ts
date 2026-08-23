/**
 * usePlatformOrganizations hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformOrganizationKeys } from '@services/query';
import { platformOrganizationService } from '../services/PlatformOrganizationService';
import type { CollectionQuery, PaginatedResult, PlatformOrganizationSummary } from '@types';
import type { ApiError } from '@api';

export interface UsePlatformOrganizationsOptions {
  readonly query?: CollectionQuery;
}

export function usePlatformOrganizations(options?: UsePlatformOrganizationsOptions) {
  return useApiQuery<PaginatedResult<PlatformOrganizationSummary>, ApiError>({
    queryKey: platformOrganizationKeys.list(options?.query),
    queryFn: () => platformOrganizationService.getOrganizations(options?.query),
  });
}
