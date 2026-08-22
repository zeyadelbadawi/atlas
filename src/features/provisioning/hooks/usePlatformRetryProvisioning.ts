/**
 * usePlatformRetryProvisioning hook.
 *
 * Platform console only. Explicit, never auto-retried.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { platformProvisioningKeys } from '@services/query';
import type { ApiError } from '@api';
import type { ProvisioningRequest } from '@types';
import { platformProvisioningService } from '../services/PlatformProvisioningService';

export function usePlatformRetryProvisioning() {
  const { invalidate } = useInvalidate();

  return useApiMutation<ProvisioningRequest, string, ApiError>({
    mutationFn: (requestId) => platformProvisioningService.retryProvisioning(requestId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, requestId) => {
      await invalidate(platformProvisioningKeys.detail(requestId));
      await invalidate(platformProvisioningKeys.all);
    },
  });
}
