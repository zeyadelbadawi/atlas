/**
 * useTrialPolicy hook.
 *
 * Fetches the Atlas Platform Owner's current trial policy. Used by the
 * Platform Trial Policy admin page; Tenant-facing pages read a
 * subscription's own `trialEndsAt` instead (see `getDaysRemaining`) and
 * never re-derive a countdown from this policy's `durationDays`.
 *
 * Seeded with `DEFAULT_TRIAL_POLICY` as `initialData` so the admin form
 * renders immediately rather than flashing a skeleton — marked stale from
 * the start (`initialDataUpdatedAt: 0`) so the real, backend-configured
 * policy always fetches and silently replaces it.
 */
import { useApiQuery } from '@/shared/hooks';
import { planKeys } from '@services/query';
import { planService } from '../services/PlanService';
import { DEFAULT_TRIAL_POLICY } from '../constants/tenant.constants';
import type { TrialPolicy } from '@types';
import type { ApiError } from '@api';

export function useTrialPolicy() {
  return useApiQuery<TrialPolicy, ApiError>({
    queryKey: planKeys.trialPolicy(),
    queryFn: () => planService.getTrialPolicy(),
    initialData: DEFAULT_TRIAL_POLICY,
    initialDataUpdatedAt: 0,
  });
}
