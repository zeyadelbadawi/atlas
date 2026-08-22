/**
 * usePaymentMethods hook.
 *
 * Fetches the enabled payment method catalog. Not organization-scoped —
 * the same list for every Tenant, like `usePlanCatalog` (Prompt 6).
 */
import { useApiQuery } from '@/shared/hooks';
import { paymentMethodKeys } from '@services/query';
import { paymentService } from '../services/PaymentService';
import type { CheckoutPaymentMethod } from '@types';
import type { ApiError } from '@api';

export function usePaymentMethods() {
  return useApiQuery<readonly CheckoutPaymentMethod[], ApiError>({
    queryKey: paymentMethodKeys.list(),
    queryFn: () => paymentService.getPaymentMethods(),
  });
}
