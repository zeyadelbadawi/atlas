/**
 * usePublicPlans hook.
 *
 * Fetches the real Plan catalog for the unauthenticated marketing
 * Pricing page. Deliberately a separate query key from `planKeys` (the
 * authenticated catalog) — same backend data, different route, and the
 * two are never invalidated together.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicPlanKeys } from '@services/query';
import { publicPlanService } from '../services/PublicPlanService';
import type { Plan } from '@types';
import type { ApiError } from '@api';

export function usePublicPlans() {
  return useApiQuery<readonly Plan[], ApiError>({
    // Declared in the shared factory so plan mutations can invalidate it.
    queryKey: publicPlanKeys.list(),
    queryFn: () => publicPlanService.getPlans(),
  });
}
