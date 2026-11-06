/**
 * useCancelPayment hook.
 *
 * Only meaningful when `capabilities.supportsCancellation` is true — the
 * page gates the action on that flag, not on `methodType`. Never
 * auto-retried.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, invalidateTenantPayments } from '@services/query';
import type { ApiError } from '@api';
import type { Payment } from '@types';
import type { PaymentProviderAdapter } from '../providers/PaymentProviderAdapter';

export interface CancelPaymentVariables {
  readonly organizationId: string;
  readonly paymentId: string;
  readonly provider: PaymentProviderAdapter;
}

export function useCancelPayment() {
  const queryClient = useQueryClient();

  return useApiMutation<Payment, CancelPaymentVariables, ApiError>({
    mutationFn: ({ organizationId, paymentId, provider }) =>
      provider.cancelPayment(organizationId, paymentId),
    showSuccessToast: false,
    showErrorToast: false,
    // B5 (UX audit) — the page shows this failure itself; no toast repeats it.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_data, variables) => {
      await invalidateTenantPayments(
        queryClient,
        variables.organizationId,
        variables.paymentId
      );
    },
  });
}
