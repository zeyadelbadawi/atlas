/**
 * useCreateInstapayMethod hook. Platform Owner only — creates an InstaPay method.
 *
 * Same shape as `useCreateBankTransferMethod`: not auto-retried; invalidates
 * the Platform Owner's list (by its prefix) and the Organization-facing
 * catalog.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { paymentMethodKeys, platformPaymentMethodKeys } from '@services/query';
import type { ApiError } from '@api';
import type { CreateInstapayMethodPayload, PlatformPaymentMethod } from '@types';
import { platformPaymentMethodService } from '../services/PlatformPaymentMethodService';

export function useCreateInstapayMethod() {
  const { invalidate } = useInvalidate();

  return useApiMutation<PlatformPaymentMethod, CreateInstapayMethodPayload, ApiError>({
    mutationFn: (payload) =>
      platformPaymentMethodService.createInstapayMethod(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformPaymentMethodKeys.lists());
      await invalidate(paymentMethodKeys.all);
    },
  });
}
