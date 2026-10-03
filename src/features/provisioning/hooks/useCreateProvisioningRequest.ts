/**
 * useCreateProvisioningRequest hook.
 *
 * `organizationId` is passed explicitly by the caller — the same pattern
 * `useCreateCheckout` (Prompt 7) uses — so a mutation already in flight
 * can't silently switch organizations underneath itself. Never
 * auto-retried: a duplicate submit must be an explicit user action,
 * replaying the SAME `idempotencyKey` the caller generated once per
 * attempt.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateProvisioning } from '@services/query';
import type { ApiError } from '@api';
import type {
  CreateProvisioningRequestPayload,
  ProvisioningRequest,
} from '@types';
import { provisioningService } from '../services/ProvisioningService';

export interface CreateProvisioningRequestVariables {
  readonly organizationId: string;
  readonly payload: CreateProvisioningRequestPayload;
}

export function useCreateProvisioningRequest() {
  const queryClient = useQueryClient();

  return useApiMutation<
    ProvisioningRequest,
    CreateProvisioningRequestVariables,
    ApiError
  >({
    mutationFn: ({ organizationId, payload }) =>
      provisioningService.createProvisioningRequest(organizationId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      // Every list of this organization (`lists`, not `list(org)`, whose
      // trailing `undefined` never matched the screen's query-bearing key).
      await invalidateProvisioning(queryClient, variables.organizationId);
    },
  });
}
