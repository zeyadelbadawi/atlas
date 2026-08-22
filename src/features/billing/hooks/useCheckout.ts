/**
 * useCheckout hook.
 *
 * Fetches one Checkout, including its frozen `snapshot`.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { checkoutKeys } from '@services/query';
import { checkoutService } from '../services/CheckoutService';
import type { Checkout } from '@types';
import type { ApiError } from '@api';

export function useCheckout(checkoutId: string) {
  const { organization } = useAuth();

  return useApiQuery<Checkout, ApiError>({
    queryKey: checkoutKeys.detail(organization?.id, checkoutId),
    queryFn: () => checkoutService.getCheckout(organization!.id, checkoutId),
    enabled: !!organization?.id && !!checkoutId,
  });
}
