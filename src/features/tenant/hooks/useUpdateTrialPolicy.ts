/**
 * useUpdateTrialPolicy hook.
 *
 * Mutation hook for the Atlas Platform Owner updating the global trial
 * policy. This is platform configuration, not a purchase/payment mutation,
 * so — unlike a hypothetical plan-upgrade/add-on-purchase mutation — it is
 * safe to expose as a normal, explicitly user-triggered write. It is still
 * never auto-retried: a failed save must be visibly retried by the admin,
 * not silently repeated.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { planKeys } from '@services/query';
import type { ApiError } from '@api';
import { planService } from '../services/PlanService';
import type { TrialPolicy } from '@types';

export function useUpdateTrialPolicy() {
  const { invalidate } = useInvalidate();

  return useApiMutation<TrialPolicy, TrialPolicy, ApiError>({
    mutationFn: (payload) => planService.updateTrialPolicy(payload),
    // The page shows its own contextual success/error feedback, consistent
    // with every other Atlas settings form (e.g. Academy Settings).
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(planKeys.trialPolicy());
    },
  });
}
