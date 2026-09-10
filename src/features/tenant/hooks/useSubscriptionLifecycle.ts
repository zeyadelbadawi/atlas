/**
 * Subscription lifecycle hooks (Phase 10.2) — starting a Free Trial and
 * cancelling a trial or a paid subscription.
 *
 * A NOTE ON "SUCCESS". `startTrial` resolves successfully even when the
 * trial is REFUSED: the backend answers 200 with `started: false` because
 * "you have already used your trial" is an ordinary business outcome, not
 * an error. These hooks therefore never show a success toast on their
 * own — the caller has to inspect the result and say something true about
 * it. A blanket "Success!" here would cheerfully announce a trial the
 * user did not get.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAuth } from '@/shared/hooks';
import { tenantKeys } from '@services/query';
import { tenantService } from '../services/TenantService';
import type {
  CancellationResult,
  CancelSubscriptionRequestInput,
  StartTrialResult,
} from '@types';
import type { ApiError } from '@api';

/** Invalidates every tenant-scoped read whose answer a lifecycle change can alter. */
function useInvalidateTenantState(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return () => {
    if (!organizationId) return;
    // The subscription itself, plus entitlement-derived views that read
    // from it — leaving those stale would show a cancelled subscription
    // as still active until the next natural refetch.
    void queryClient.invalidateQueries({
      queryKey: tenantKeys.subscription(organizationId),
    });
    void queryClient.invalidateQueries({ queryKey: tenantKeys.usage(organizationId) });
  };
}

export function useStartTrial() {
  const { organization } = useAuth();
  const invalidate = useInvalidateTenantState(organization?.id);

  return useApiMutation<StartTrialResult, { planId?: string }, ApiError>({
    mutationFn: ({ planId }) => tenantService.startTrial(organization!.id, { planId }),
    onSuccess: invalidate,
    // Both outcomes are surfaced by the caller, which is the only place
    // that knows whether `started` was true. See this file's header.
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export function useCancelTrial() {
  const { organization } = useAuth();
  const invalidate = useInvalidateTenantState(organization?.id);

  return useApiMutation<CancellationResult, CancelSubscriptionRequestInput, ApiError>({
    mutationFn: (input) => tenantService.cancelTrial(organization!.id, input),
    onSuccess: invalidate,
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export function useCancelSubscription() {
  const { organization } = useAuth();
  const invalidate = useInvalidateTenantState(organization?.id);

  return useApiMutation<CancellationResult, CancelSubscriptionRequestInput, ApiError>({
    mutationFn: (input) => tenantService.cancelSubscription(organization!.id, input),
    onSuccess: invalidate,
    showSuccessToast: false,
    showErrorToast: false,
  });
}
