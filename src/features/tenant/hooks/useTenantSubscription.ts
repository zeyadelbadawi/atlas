/**
 * useTenantSubscription hook.
 *
 * Fetches the active organization's (the Tenant's) subscription.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { tenantKeys } from '@services/query';
import { tenantService } from '../services/TenantService';
import type { TenantSubscription } from '@types';
import type { ApiError } from '@api';

export function useTenantSubscription() {
  // The session's real active organization — the same source `useAcademies`
  // uses — so the query key (and therefore the cache) always matches the
  // Tenant actually in view, and refetches automatically on organization
  // switch.
  const { organization } = useAuth();

  return useApiQuery<TenantSubscription, ApiError>({
    queryKey: tenantKeys.subscription(organization?.id),
    queryFn: () => tenantService.getSubscription(organization!.id),
    enabled: !!organization?.id,
  });
}
