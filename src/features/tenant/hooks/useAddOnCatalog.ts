/**
 * useAddOnCatalog hook.
 *
 * Fetches every Add-on Atlas offers (distinct from `useTenantAddOns`, which
 * lists only the ones active on the current Tenant's subscription).
 */
import { useApiQuery } from '@/shared/hooks';
import { planKeys } from '@services/query';
import { planService } from '../services/PlanService';
import type { AddOn } from '@types';
import type { ApiError } from '@api';

export function useAddOnCatalog() {
  return useApiQuery<readonly AddOn[], ApiError>({
    queryKey: planKeys.addOnList(),
    queryFn: () => planService.getAddOns(),
  });
}
