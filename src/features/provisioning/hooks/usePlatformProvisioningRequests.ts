/**
 * usePlatformProvisioningRequests hook.
 *
 * Cross-tenant listing for the Platform Provisioning console. Deliberately
 * NOT organization-scoped — see `platformProvisioningKeys`'s doc comment.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformProvisioningKeys } from '@services/query';
import { platformProvisioningService } from '../services/PlatformProvisioningService';
import type { CollectionQuery, PaginatedResult, ProvisioningRequest } from '@types';
import type { ApiError } from '@api';

export interface UsePlatformProvisioningRequestsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function usePlatformProvisioningRequests(
  options?: UsePlatformProvisioningRequestsOptions
) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<ProvisioningRequest>, ApiError>({
    queryKey: platformProvisioningKeys.list(query),
    queryFn: () => platformProvisioningService.getProvisioningRequests(query),
    enabled,
  });
}
