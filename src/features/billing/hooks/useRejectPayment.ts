/**
 * useRejectPayment hook.
 *
 * Platform review only. Not auto-retried, same reasoning as `useApprovePayment`.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { platformPaymentKeys } from '@services/query';
import type { ApiError } from '@api';
import type { Payment, RejectPaymentPayload } from '@types';
import { platformPaymentService } from '../services/PlatformPaymentService';

export interface RejectPaymentVariables {
  readonly paymentId: string;
  readonly payload: RejectPaymentPayload;
}

export function useRejectPayment() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Payment, RejectPaymentVariables, ApiError>({
    mutationFn: ({ paymentId, payload }) =>
      platformPaymentService.rejectPayment(paymentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(platformPaymentKeys.detail(variables.paymentId));
      await invalidate(platformPaymentKeys.all);
    },
  });
}
