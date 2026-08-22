/**
 * useCancelProvisioning hook.
 *
 * Explicit, user-triggered, never auto-retried.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { provisioningKeys } from '@services/query';
import type { ApiError } from '@api';
import type { ProvisioningRequest } from '@types';
import { provisioningService } from '../services/ProvisioningService';

export interface CancelProvisioningVariables {
  readonly organizationId: string;
  readonly requestId: string;
}

export function useCancelProvisioning() {
  const { invalidate } = useInvalidate();

  return useApiMutation<ProvisioningRequest, CancelProvisioningVariables, ApiError>({
    mutationFn: ({ organizationId, requestId }) =>
      provisioningService.cancelProvisioning(organizationId, requestId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(
        provisioningKeys.detail(variables.organizationId, variables.requestId)
      );
    },
  });
}
