/**
 * useProvisioningRequest hook.
 *
 * The single query behind `ProvisioningStatusPage`. Restores state purely
 * from the backend on every mount/refresh — never from local component
 * state, a timer, or `localStorage` (see `Reports/ARCHITECTURE.md`,
 * Prompt 8, "Multi-Tab / Refresh Behavior"): opening this page in two tabs
 * just runs two read-only queries against the same backend-authoritative
 * record, never two provisioning operations.
 *
 * Polls while the request is genuinely in progress (see
 * `PROVISIONING_STATUS_POLL_INTERVAL_MS`), stops at any terminal status —
 * the same discipline Prompt 7's `usePaymentDetails` established.
 *
 * The moment `status` is first observed transitioning INTO `'ready'`, this
 * hook invalidates `academyKeys` (Prompt 3B — the new Academy must appear
 * in lists/switchers) and Prompt 6's `tenantKeys.usage` (the Tenant's
 * academy count went up), precisely rather than clearing the whole
 * QueryClient.
 */
import { useEffect, useRef } from 'react';
import { useApiQuery, useAuth, useInvalidate } from '@/shared/hooks';
import { academyKeys, provisioningKeys, tenantKeys } from '@services/query';
import { provisioningService } from '../services/ProvisioningService';
import { PROVISIONING_STATUS_POLL_INTERVAL_MS } from '../constants/provisioning.constants';
import { TERMINAL_PROVISIONING_STATUSES } from '@types';
import type { ProvisioningRequest } from '@types';
import type { ApiError } from '@api';

export function useProvisioningRequest(requestId: string) {
  const { organization } = useAuth();
  const { invalidate } = useInvalidate();
  const previousStatusRef = useRef<ProvisioningRequest['status'] | undefined>(undefined);

  const query = useApiQuery<ProvisioningRequest, ApiError>({
    queryKey: provisioningKeys.detail(organization?.id, requestId),
    queryFn: () => provisioningService.getProvisioningRequest(organization!.id, requestId),
    enabled: !!organization?.id && !!requestId,
    refetchInterval: (activeQuery) => {
      const request = activeQuery.state.data;
      if (!request) return false;
      if (TERMINAL_PROVISIONING_STATUSES.includes(request.status)) return false;
      return PROVISIONING_STATUS_POLL_INTERVAL_MS;
    },
  });

  useEffect(() => {
    const current = query.data?.status;
    const previous = previousStatusRef.current;
    previousStatusRef.current = current;

    if (current === 'ready' && previous !== 'ready' && previous !== undefined) {
      void invalidate(academyKeys.all);
      void invalidate(tenantKeys.usage(organization?.id));
    }
  }, [query.data?.status, invalidate, organization?.id]);

  return query;
}
