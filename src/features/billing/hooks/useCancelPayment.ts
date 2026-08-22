/**
 * useCancelPayment hook.
 *
 * Only meaningful when `capabilities.supportsCancellation` is true — the
 * page gates the action on that flag, not on `methodType`. Never
 * auto-retried.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { paymentKeys } from '@services/query';
import type { ApiError } from '@api';
import type { Payment } from '@types';
import type { PaymentProviderAdapter } from '../providers/PaymentProviderAdapter';

export interface CancelPaymentVariables {
  readonly organizationId: string;
  readonly paymentId: string;
  readonly provider: PaymentProviderAdapter;
}

export function useCancelPayment() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Payment, CancelPaymentVariables, ApiError>({
    mutationFn: ({ organizationId, paymentId, provider }) =>
      provider.cancelPayment(organizationId, paymentId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(
        paymentKeys.detail(variables.organizationId, variables.paymentId)
      );
      await invalidate(paymentKeys.list(variables.organizationId));
    },
  });
}
