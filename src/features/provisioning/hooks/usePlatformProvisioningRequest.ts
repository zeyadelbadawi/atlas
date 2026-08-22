/**
 * usePlatformProvisioningRequest hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformProvisioningKeys } from '@services/query';
import { platformProvisioningService } from '../services/PlatformProvisioningService';
import type { ProvisioningRequest } from '@types';
import type { ApiError } from '@api';

export function usePlatformProvisioningRequest(requestId: string) {
  return useApiQuery<ProvisioningRequest, ApiError>({
    queryKey: platformProvisioningKeys.detail(requestId),
    queryFn: () => platformProvisioningService.getProvisioningRequest(requestId),
    enabled: !!requestId,
  });
}
