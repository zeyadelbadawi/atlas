/**
 * useRetryProvisioning hook.
 *
 * Never auto-retried by the hook itself — this IS the explicit,
 * user-triggered retry action (see `Reports/ARCHITECTURE.md`, Prompt 8,
 * "Retry / Recovery"). Continues from wherever the request stands; it
 * does not conceptually recreate the Tenant/Academy/Theme/Branding steps
 * already completed.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateProvisioning } from '@services/query';
import type { ApiError } from '@api';
import type { ProvisioningRequest } from '@types';
import { provisioningService } from '../services/ProvisioningService';

export interface RetryProvisioningVariables {
  readonly organizationId: string;
  readonly requestId: string;
}

export function useRetryProvisioning() {
  const queryClient = useQueryClient();

  return useApiMutation<
    ProvisioningRequest,
    RetryProvisioningVariables,
    ApiError
  >({
    mutationFn: ({ organizationId, requestId }) =>
      provisioningService.retryProvisioning(organizationId, requestId),
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
