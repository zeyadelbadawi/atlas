/**
 * useCreateBankTransferMethod hook. Platform Owner only.
 *
 * Not auto-retried. Invalidates the Platform Owner's list (by its prefix,
 * so every cached page/query matches) and the Organization-facing catalog.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { paymentMethodKeys, platformPaymentMethodKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  CreateBankTransferMethodPayload,
  PlatformPaymentMethod,
} from '@types';
import { platformPaymentMethodService } from '../services/PlatformPaymentMethodService';

export function useCreateBankTransferMethod() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    PlatformPaymentMethod,
    CreateBankTransferMethodPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      platformPaymentMethodService.createBankTransferMethod(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformPaymentMethodKeys.lists());
      await invalidate(paymentMethodKeys.all);
    },
  });
}
