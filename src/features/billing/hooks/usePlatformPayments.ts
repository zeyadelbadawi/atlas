/**
 * usePlatformPayments hook.
 *
 * Cross-tenant payment listing for platform review. Deliberately NOT
 * organization-scoped — see `platformPaymentKeys`'s doc comment.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformPaymentKeys } from '@services/query';
import { platformPaymentService } from '../services/PlatformPaymentService';
import type { CollectionQuery, PaginatedResult, Payment } from '@types';
import type { ApiError } from '@api';

export interface UsePlatformPaymentsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function usePlatformPayments(options?: UsePlatformPaymentsOptions) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<Payment>, ApiError>({
    queryKey: platformPaymentKeys.list(query),
    queryFn: () => platformPaymentService.getPayments(query),
    enabled,
  });
}
