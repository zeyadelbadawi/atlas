/**
 * Data hooks for Add-ons Catalog Management.
 *
 * The list hook passes the whole query through to the server so the cache
 * key changes with every filter/page. The mutation invalidates the list so
 * a status change is reflected immediately; the optimistic-concurrency
 * conflict (`stale_resource_version`) surfaces as an ordinary error the
 * page reacts to, and the shared error toast explains it.
 */
import { useApiQuery, useApiMutation } from '@/shared/hooks';
import { platformAddOnKeys } from '@services/query';
import { platformAddOnsService } from '../services/PlatformAddOnsService';
import type {
  PlatformAddOnRow,
  PlatformAddOnQuery,
  UpdateAddOnCatalogStatusInput,
} from '../types';
import type { PaginatedResponse } from '@types';
import type { ApiError } from '@api';

export function usePlatformAddOns(query: PlatformAddOnQuery) {
  return useApiQuery<PaginatedResponse<PlatformAddOnRow>, ApiError>({
    queryKey: platformAddOnKeys.list(query),
    queryFn: () => platformAddOnsService.list(query),
  });
}

export function useUpdateAddOnCatalogStatus() {
  return useApiMutation<
    PlatformAddOnRow,
    { key: string; input: UpdateAddOnCatalogStatusInput },
    ApiError
  >({
    mutationFn: ({ key, input }) =>
      platformAddOnsService.updateCatalogStatus(key, input),
    successMessageKey: 'platformAddOns:toast.statusChanged',
    invalidateKeys: [platformAddOnKeys.all],
  });
}
