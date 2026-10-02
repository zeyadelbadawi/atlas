/**
 * useUpdatePlatformPaymentMethod hook. Platform Owner only — backs both
 * editing a method's details and the Enable/Disable action.
 *
 * Not auto-retried. Invalidates the Platform Owner's list (by its prefix)
 * and the Organization-facing catalog, since enabling or disabling a
 * method changes what Organizations are offered at checkout.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { paymentMethodKeys, platformPaymentMethodKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  PlatformPaymentMethod,
  UpdatePlatformPaymentMethodPayload,
} from '@types';
import { platformPaymentMethodService } from '../services/PlatformPaymentMethodService';

export interface UpdatePlatformPaymentMethodVariables {
  readonly methodId: string;
  readonly payload: UpdatePlatformPaymentMethodPayload;
}

export function useUpdatePlatformPaymentMethod() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    PlatformPaymentMethod,
    UpdatePlatformPaymentMethodVariables,
    ApiError
  >({
    mutationFn: ({ methodId, payload }) =>
      platformPaymentMethodService.updatePaymentMethod(methodId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformPaymentMethodKeys.lists());
      await invalidate(paymentMethodKeys.all);
    },
  });
}
