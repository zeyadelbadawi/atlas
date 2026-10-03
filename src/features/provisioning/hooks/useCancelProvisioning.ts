/**
 * useCancelProvisioning hook.
 *
 * Explicit, user-triggered, never auto-retried.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateProvisioning } from '@services/query';
import type { ApiError } from '@api';
import type { ProvisioningRequest } from '@types';
import { provisioningService } from '../services/ProvisioningService';

export interface CancelProvisioningVariables {
  readonly organizationId: string;
  readonly requestId: string;
}

export function useCancelProvisioning() {
  const queryClient = useQueryClient();

  return useApiMutation<
    ProvisioningRequest,
    CancelProvisioningVariables,
    ApiError
  >({
    mutationFn: ({ organizationId, requestId }) =>
      provisioningService.cancelProvisioning(organizationId, requestId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      // The detail AND the lists (the request's status column changes).
      await invalidateProvisioning(
        queryClient,
        variables.organizationId,
        variables.requestId
      );
    },
  });
}
