/**
 * useProvisioningRequests hook.
 *
 * The Tenant's provisioning history — lets a customer who left mid-flow
 * find their request again (see `Reports/ARCHITECTURE.md`, Prompt 8,
 * "Customer Can Leave Provisioning").
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { provisioningKeys } from '@services/query';
import { provisioningService } from '../services/ProvisioningService';
import type { CollectionQuery, PaginatedResult, ProvisioningRequest } from '@types';
import type { ApiError } from '@api';

export interface UseProvisioningRequestsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useProvisioningRequests(options?: UseProvisioningRequestsOptions) {
  const { query, enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<PaginatedResult<ProvisioningRequest>, ApiError>({
    queryKey: provisioningKeys.list(organization?.id, query),
    queryFn: () => provisioningService.getProvisioningRequests(organization!.id, query),
    enabled: enabled && !!organization?.id,
  });
}
