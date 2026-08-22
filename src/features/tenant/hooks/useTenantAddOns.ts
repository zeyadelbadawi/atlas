/**
 * useTenantAddOns hook.
 *
 * Fetches the Add-ons currently active on the Tenant's subscription
 * (distinct from `useAddOnCatalog`, which lists every Add-on Atlas offers).
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { tenantKeys } from '@services/query';
import { tenantService } from '../services/TenantService';
import type { TenantAddOn } from '@types';
import type { ApiError } from '@api';

export function useTenantAddOns() {
  const { organization } = useAuth();

  return useApiQuery<readonly TenantAddOn[], ApiError>({
    queryKey: tenantKeys.addOns(organization?.id),
    queryFn: () => tenantService.getActiveAddOns(organization!.id),
    enabled: !!organization?.id,
  });
}
