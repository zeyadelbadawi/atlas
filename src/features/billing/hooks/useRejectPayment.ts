/**
 * useRejectPayment hook.
 *
 * Platform review only. Not auto-retried, same reasoning as `useApprovePayment`.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { subscriptionPaymentDecisionKeys } from './platform-payment-decision.keys';
import type { ApiError } from '@api';
import { INLINE_ERRORS_META } from '@services/query';
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
    // B8 (UX audit) V03 — the review page shows the one message (inline,
    // with the real reason); the app-wide reporter adds no second one.
    meta: { [INLINE_ERRORS_META]: true },
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
