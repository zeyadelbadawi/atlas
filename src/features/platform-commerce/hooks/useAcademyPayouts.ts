/**
 * Platform Owner academy payout hooks.
 *
 * Create and mark-paid are money-recording writes: never auto-retried
 * (the HTTP client only replays idempotent methods), no generic toast — the
 * page reports the specific outcome, including the honest "nothing owed"
 * empty result of a create.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { platformAcademyPayoutKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  AcademyPayout,
  CollectionQuery,
  CreateAcademyPayoutPayload,
  MarkAcademyPayoutPaidPayload,
  PaginatedResult,
} from '@types';
import { platformAcademyPayoutService } from '../services/PlatformAcademyPayoutService';

export function useAcademyPayouts(query?: CollectionQuery) {
  return useApiQuery<PaginatedResult<AcademyPayout>, ApiError>({
    queryKey: platformAcademyPayoutKeys.list(query),
    queryFn: () => platformAcademyPayoutService.getPayouts(query),
  });
}

export function useCreateAcademyPayout() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    readonly AcademyPayout[],
    CreateAcademyPayoutPayload,
    ApiError
  >({
    mutationFn: (payload) => platformAcademyPayoutService.createPayout(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformAcademyPayoutKeys.all);
    },
  });
}

export interface MarkAcademyPayoutPaidVariables {
  readonly payoutId: string;
  readonly payload: MarkAcademyPayoutPaidPayload;
}

export function useMarkAcademyPayoutPaid() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    AcademyPayout,
    MarkAcademyPayoutPaidVariables,
    ApiError
  >({
    mutationFn: ({ payoutId, payload }) =>
      platformAcademyPayoutService.markPaid(payoutId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformAcademyPayoutKeys.all);
    },
  });
}
