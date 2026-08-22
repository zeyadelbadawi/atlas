/**
 * useCreatePayment hook.
 *
 * Creates the Payment for a Checkout through its resolved provider adapter
 * — never `PaymentService` directly from a component — so the component
 * never has to know which provider handled it. Not auto-retried: a
 * duplicate submit must be an explicit user action.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { paymentKeys } from '@services/query';
import type { ApiError } from '@api';
import type { Checkout, Payment } from '@types';
import type { PaymentProviderAdapter } from '../providers/PaymentProviderAdapter';

export interface CreatePaymentVariables {
  readonly organizationId: string;
  readonly checkout: Checkout;
  readonly methodKey: string;
  readonly provider: PaymentProviderAdapter;
}

export function useCreatePayment() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Payment, CreatePaymentVariables, ApiError>({
    mutationFn: ({ checkout, methodKey, provider }) =>
      provider.createPayment(checkout, methodKey),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(paymentKeys.list(variables.organizationId));
    },
  });
}
