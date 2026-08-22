/**
 * usePaymentHistory hook.
 *
 * Works identically for manual and future gateway payments — both are the
 * same `Payment` shape (see `payment.types.ts`).
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { paymentKeys } from '@services/query';
import { paymentService } from '../services/PaymentService';
import type { CollectionQuery, PaginatedResult, Payment } from '@types';
import type { ApiError } from '@api';

export interface UsePaymentHistoryOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function usePaymentHistory(options?: UsePaymentHistoryOptions) {
  const { query, enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<PaginatedResult<Payment>, ApiError>({
    queryKey: paymentKeys.list(organization?.id, query),
    queryFn: () => paymentService.getPayments(organization!.id, query),
    enabled: enabled && !!organization?.id,
  });
}
