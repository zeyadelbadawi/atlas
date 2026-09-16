import { useApiQuery } from '@/shared/hooks';
import { platformDomainKeys } from '@services/query';
import { platformDomainsService } from '../services/PlatformDomainsService';
import type {
  CollectionQuery,
  PaginatedResult,
  PlatformDomainRow,
  PlatformDomainsOverview,
} from '@types';
import type { ApiError } from '@api';

export interface UsePlatformDomainsOptions {
  readonly query?: CollectionQuery;
}

/** P63 — the Platform Owner's cross-tenant domain list. Filters live in the query key: two filter sets are two cached results. */
export function usePlatformDomains(options?: UsePlatformDomainsOptions) {
  return useApiQuery<PaginatedResult<PlatformDomainRow>, ApiError>({
    queryKey: platformDomainKeys.operationsList(options?.query),
    queryFn: () => platformDomainsService.list(options?.query),
  });
}

export function usePlatformDomainsOverview() {
  return useApiQuery<PlatformDomainsOverview, ApiError>({
    queryKey: platformDomainKeys.operationsOverview(),
    queryFn: () => platformDomainsService.getOverview(),
  });
}
