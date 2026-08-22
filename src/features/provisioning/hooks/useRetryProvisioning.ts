/**
 * useRetryProvisioning hook.
 *
 * Never auto-retried by the hook itself — this IS the explicit,
 * user-triggered retry action (see `Reports/ARCHITECTURE.md`, Prompt 8,
 * "Retry / Recovery"). Continues from wherever the request stands; it
 * does not conceptually recreate the Tenant/Academy/Theme/Branding steps
 * already completed.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { provisioningKeys } from '@services/query';
import type { ApiError } from '@api';
import type { ProvisioningRequest } from '@types';
import { provisioningService } from '../services/ProvisioningService';

export interface RetryProvisioningVariables {
  readonly organizationId: string;
  readonly requestId: string;
}

export function useRetryProvisioning() {
  const { invalidate } = useInvalidate();

  return useApiMutation<ProvisioningRequest, RetryProvisioningVariables, ApiError>({
    mutationFn: ({ organizationId, requestId }) =>
      provisioningService.retryProvisioning(organizationId, requestId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(
        provisioningKeys.detail(variables.organizationId, variables.requestId)
      );
    },
  });
}
