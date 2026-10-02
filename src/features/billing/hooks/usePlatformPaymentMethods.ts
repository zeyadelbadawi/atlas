/**
 * usePlatformPaymentMethods hook. Platform Owner only.
 *
 * Every payment method, enabled or not — see `platformPaymentMethodKeys`.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformPaymentMethodKeys } from '@services/query';
import { platformPaymentMethodService } from '../services/PlatformPaymentMethodService';
import type {
  CollectionQuery,
  PaginatedResult,
  PlatformPaymentMethod,
} from '@types';
import type { ApiError } from '@api';

export interface UsePlatformPaymentMethodsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function usePlatformPaymentMethods(
  options?: UsePlatformPaymentMethodsOptions
) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<PlatformPaymentMethod>, ApiError>({
    queryKey: platformPaymentMethodKeys.list(query),
    queryFn: () => platformPaymentMethodService.getPaymentMethods(query),
    enabled,
  });
}
