/**
 * usePlanByKey hook (B0-BIL-11).
 *
 * One plan by its key, hidden ones included. The catalog list only carries
 * customer-facing plans, so a hidden plan (a founding price lock or an
 * Enterprise deal, shared with one customer by key) is never in it; the
 * checkout page asks for it directly. Disabled until a key is known.
 */
import { useApiQuery } from '@/shared/hooks';
import { planKeys } from '@services/query';
import { planService } from '../services/PlanService';
import type { Plan } from '@types';
import type { ApiError } from '@api';

export function usePlanByKey(key: string | undefined, enabled = true) {
  return useApiQuery<Plan, ApiError>({
    queryKey: planKeys.detail(key ?? ''),
    queryFn: () => planService.getPlan(key!),
    enabled: Boolean(key) && enabled,
  });
}
