/**
 * useSubmitPaymentProof hook.
 *
 * Delegates to the payment's resolved provider adapter — not
 * `PaymentService` directly — consistent with `useCreatePayment`. Submitting
 * proof moves `reviewStatus` to `'pending'` on the backend; it never
 * implies the payment succeeded, so this mutation shows no "success"
 * messaging beyond "submitted for review" (the page owns that copy).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, invalidateTenantPayments } from '@services/query';
import type { ApiError } from '@api';
import type { Payment } from '@types';
import type { ManualReviewPaymentProviderAdapter } from '../providers/PaymentProviderAdapter';

export interface SubmitPaymentProofVariables {
  readonly organizationId: string;
  readonly paymentId: string;
  readonly file: File;
  readonly note?: string;
  readonly provider: ManualReviewPaymentProviderAdapter;
}

export function useSubmitPaymentProof() {
  const queryClient = useQueryClient();

  return useApiMutation<Payment, SubmitPaymentProofVariables, ApiError>({
    mutationFn: ({ organizationId, paymentId, file, note, provider }) =>
      provider.submitProof(organizationId, paymentId, file, note),
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
