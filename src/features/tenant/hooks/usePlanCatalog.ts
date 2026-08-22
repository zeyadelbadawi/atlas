/**
 * usePlanCatalog hook.
 *
 * Fetches the full Plan catalog. Not organization-scoped — every Tenant
 * reads the same catalog — so unlike the `useTenant*` hooks this has no
 * `enabled` gate on an active organization.
 */
import { useApiQuery } from '@/shared/hooks';
import { planKeys } from '@services/query';
import { planService } from '../services/PlanService';
import type { Plan } from '@types';
import type { ApiError } from '@api';

export function usePlanCatalog() {
  return useApiQuery<readonly Plan[], ApiError>({
    queryKey: planKeys.list(),
    queryFn: () => planService.getPlans(),
  });
}
