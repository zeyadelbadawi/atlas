/**
 * B0-BIL-06 — mutations for the Platform Owner's audited subscription
 * remedies. Each refreshes the organization detail, which carries the
 * subscription the page shows.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { platformOrganizationKeys } from '@services/query';
import {
  adminSubscriptionsService,
  type SubscriptionDaysAdjustment,
  type SubscriptionPlanChange,
} from '../services/AdminSubscriptionsService';
import type { TenantSubscription } from '@types';
import type { ApiError } from '@api';

export type SubscriptionAdjustmentInput =
  | ({ readonly kind: 'extend' | 'grant-days' } & SubscriptionDaysAdjustment)
  | ({ readonly kind: 'change-plan' } & SubscriptionPlanChange);

export function useSubscriptionAdjustment(organizationId: string) {
  const queryClient = useQueryClient();
  return useApiMutation<
    TenantSubscription,
    SubscriptionAdjustmentInput,
    ApiError
  >({
    mutationFn: (input) =>
      input.kind === 'change-plan'
        ? adminSubscriptionsService.changePlan(organizationId, {
            planKey: input.planKey,
            applyAt: input.applyAt,
            reason: input.reason,
          })
        : adminSubscriptionsService.adjustDays(organizationId, input.kind, {
            days: input.days,
            reason: input.reason,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformOrganizationKeys.detail(organizationId),
      });
    },
    showSuccessToast: false,
    showErrorToast: false,
  });
}
