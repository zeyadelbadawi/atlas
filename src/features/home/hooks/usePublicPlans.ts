/**
 * usePublicPlans hook.
 *
 * Fetches the real Plan catalog for the unauthenticated marketing
 * Pricing page. Deliberately a separate query key from `planKeys` (the
 * authenticated catalog) — same backend data, different route, and the
 * two are never invalidated together.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicPlanService } from '../services/PublicPlanService';
import type { Plan } from '@types';
import type { ApiError } from '@api';

export function usePublicPlans() {
  return useApiQuery<readonly Plan[], ApiError>({
    queryKey: ['public-plans', 'list'],
    queryFn: () => publicPlanService.getPlans(),
  });
}
