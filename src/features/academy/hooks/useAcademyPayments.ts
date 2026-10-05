/**
 * Academy Manual Payments — the Client Owner's hooks: the academy's own
 * payment methods (read, save) and the review of learners' payments (list,
 * detail, approve, reject).
 *
 * Keys carry the academy id (`academyPaymentMethodKeys`,
 * `academyCoursePaymentKeys`), so one academy's data is never shown under
 * another's name. Approve/reject are not auto-retried and show no toast of
 * their own — the page reports the exact outcome — and invalidate what a
 * decision changes: the review list, the academy's orders, and the learner
 * side the next time it is read.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import {
  academyCourseOrderKeys,
  academyCoursePaymentKeys,
  academyPaymentMethodKeys,
} from '@services/query';
import type { ApiError } from '@api';
import type {
  AcademyCoursePaymentDetail,
  AcademyCoursePaymentListQuery,
  AcademyPaymentMethod,
  ApproveAcademyCoursePaymentPayload,
  RejectAcademyCoursePaymentPayload,
  SaveAcademyPaymentMethodPayload,
} from '@types';
import {
  academyPaymentsService,
  type AcademyCoursePaymentPage,
} from '../services/AcademyPaymentsService';

export function useAcademyPaymentMethods(academyId: string) {
  return useApiQuery<AcademyPaymentMethod[], ApiError>({
    queryKey: academyPaymentMethodKeys.list(academyId || undefined),
    queryFn: () => academyPaymentsService.getMethods(academyId),
    enabled: academyId.length > 0,
  });
}

export function useSaveAcademyPaymentMethod(academyId: string) {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    AcademyPaymentMethod,
    SaveAcademyPaymentMethodPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      academyPaymentsService.saveMethod(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(academyPaymentMethodKeys.list(academyId));
    },
  });
}

export function useAcademyCoursePayments(
  academyId: string,
  query: AcademyCoursePaymentListQuery
) {
  return useApiQuery<AcademyCoursePaymentPage, ApiError>({
    queryKey: academyCoursePaymentKeys.list(academyId || undefined, query),
    queryFn: () => academyPaymentsService.getPayments(academyId, query),
    enabled: academyId.length > 0,
    // Learners submit from their own browsers: keep the queue current
    // while it is on screen (paused in background tabs).
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}

export function useAcademyCoursePayment(
  academyId: string,
  paymentId: string | undefined
) {
  return useApiQuery<AcademyCoursePaymentDetail, ApiError>({
    queryKey: academyCoursePaymentKeys.detail(
      academyId || undefined,
      paymentId
    ),
    queryFn: () => academyPaymentsService.getPayment(academyId, paymentId!),
    enabled: academyId.length > 0 && !!paymentId,
  });
}

function useDecisionInvalidation(academyId: string) {
  const { invalidate } = useInvalidate();
  return async () => {
    await Promise.all([
      invalidate(academyCoursePaymentKeys.all),
      invalidate(academyCourseOrderKeys.all),
      invalidate(academyCoursePaymentKeys.list(academyId)),
    ]);
  };
}

export function useApproveAcademyCoursePayment(academyId: string) {
  const onDecided = useDecisionInvalidation(academyId);
  return useApiMutation<
    AcademyCoursePaymentDetail,
    { paymentId: string; payload: ApproveAcademyCoursePaymentPayload },
    ApiError
  >({
    mutationFn: ({ paymentId, payload }) =>
      academyPaymentsService.approvePayment(academyId, paymentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: onDecided,
  });
}

export function useRejectAcademyCoursePayment(academyId: string) {
  const onDecided = useDecisionInvalidation(academyId);
  return useApiMutation<
    AcademyCoursePaymentDetail,
    { paymentId: string; payload: RejectAcademyCoursePaymentPayload },
    ApiError
  >({
    mutationFn: ({ paymentId, payload }) =>
      academyPaymentsService.rejectPayment(academyId, paymentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: onDecided,
  });
}
