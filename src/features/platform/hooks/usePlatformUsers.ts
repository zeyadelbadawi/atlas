/**
 * usePlatformUsers hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformUserKeys } from '@services/query';
import { platformUserService } from '../services/PlatformUserService';
import type { CollectionQuery, PaginatedResult, PlatformUserSummary } from '@types';
import type { ApiError } from '@api';

export interface UsePlatformUsersOptions {
  readonly query?: CollectionQuery;
}

export function usePlatformUsers(options?: UsePlatformUsersOptions) {
  return useApiQuery<PaginatedResult<PlatformUserSummary>, ApiError>({
    queryKey: platformUserKeys.list(options?.query),
    queryFn: () => platformUserService.getUsers(options?.query),
  });
}
