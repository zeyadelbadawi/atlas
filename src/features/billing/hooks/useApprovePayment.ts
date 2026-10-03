/**
 * useApprovePayment hook.
 *
 * Platform review only. Not auto-retried — approving is a financial
 * mutation the reviewer must explicitly repeat on failure, never silently
 * replayed.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { subscriptionPaymentDecisionKeys } from './platform-payment-decision.keys';
import type { ApiError } from '@api';
import type { ApprovePaymentPayload, Payment } from '@types';
import { platformPaymentService } from '../services/PlatformPaymentService';

export interface ApprovePaymentVariables {
  readonly paymentId: string;
  readonly payload: ApprovePaymentPayload;
}

export function useApprovePayment() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Payment, ApprovePaymentVariables, ApiError>({
    mutationFn: ({ paymentId, payload }) =>
      platformPaymentService.approvePayment(paymentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (data, variables) => {
      await Promise.all(
        subscriptionPaymentDecisionKeys(
          variables.paymentId,
          data?.organizationId
        ).map((key) => invalidate(key))
      );
    },
  });
}
