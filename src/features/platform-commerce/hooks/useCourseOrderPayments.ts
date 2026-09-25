/**
 * Platform Owner course-order payment review hooks.
 *
 * Approve/reject are NOT auto-retried and show no toast of their own — they
 * are financial mutations the reviewer must explicitly repeat on failure,
 * and the page renders the specific outcome itself (same contract as
 * `useApprovePayment`/`useRejectPayment` in `features/billing`).
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { platformCourseOrderPaymentKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  ApprovePaymentPayload,
  CollectionQuery,
  CourseOrderPayment,
  PaginatedResult,
  RejectPaymentPayload,
} from '@types';
import { platformCourseOrderPaymentService } from '../services/PlatformCourseOrderPaymentService';

export interface UseCourseOrderPaymentsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useCourseOrderPayments(
  options?: UseCourseOrderPaymentsOptions
) {
  const { query, enabled = true } = options ?? {};
  return useApiQuery<PaginatedResult<CourseOrderPayment>, ApiError>({
    queryKey: platformCourseOrderPaymentKeys.list(query),
    queryFn: () => platformCourseOrderPaymentService.getPayments(query),
    enabled,
  });
}

export function useCourseOrderPayment(paymentId: string) {
  return useApiQuery<CourseOrderPayment, ApiError>({
    queryKey: platformCourseOrderPaymentKeys.detail(paymentId),
    queryFn: () => platformCourseOrderPaymentService.getPayment(paymentId),
    enabled: paymentId.length > 0,
  });
}

export interface ApproveCourseOrderPaymentVariables {
  readonly paymentId: string;
  readonly payload: ApprovePaymentPayload;
}

export function useApproveCourseOrderPayment() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    CourseOrderPayment,
    ApproveCourseOrderPaymentVariables,
    ApiError
  >({
    mutationFn: ({ paymentId, payload }) =>
      platformCourseOrderPaymentService.approvePayment(paymentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformCourseOrderPaymentKeys.all);
    },
  });
}

export interface RejectCourseOrderPaymentVariables {
  readonly paymentId: string;
  readonly payload: RejectPaymentPayload;
}

export function useRejectCourseOrderPayment() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    CourseOrderPayment,
    RejectCourseOrderPaymentVariables,
    ApiError
  >({
    mutationFn: ({ paymentId, payload }) =>
      platformCourseOrderPaymentService.rejectPayment(paymentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformCourseOrderPaymentKeys.all);
    },
  });
}
