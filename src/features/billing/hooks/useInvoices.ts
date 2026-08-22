/**
 * useInvoices hook.
 *
 * Invoice-ready — reads whatever the backend has issued. No accounting
 * logic on the frontend.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { invoiceKeys } from '@services/query';
import { paymentService } from '../services/PaymentService';
import type { CollectionQuery, PaginatedResult, TenantInvoice } from '@types';
import type { ApiError } from '@api';

export interface UseInvoicesOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useInvoices(options?: UseInvoicesOptions) {
  const { query, enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<PaginatedResult<TenantInvoice>, ApiError>({
    queryKey: invoiceKeys.list(organization?.id, query),
    queryFn: () => paymentService.getInvoices(organization!.id, query),
    enabled: enabled && !!organization?.id,
  });
}
