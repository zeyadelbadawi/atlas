/**
 * Platform Owner course-order payment review hooks.
 *
 * Approve/reject are NOT auto-retried and show no toast of their own — they
 * are financial mutations the reviewer must explicitly repeat on failure,
 * and the page renders the specific outcome itself (same contract as
 * `useApprovePayment`/`useRejectPayment` in `features/billing`).
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import {
  academyCourseOrderKeys,
  academyPayoutKeys,
  analyticsKeys,
  platformAcademyKeys,
  platformAcademyPayoutKeys,
  platformCourseKeys,
  platformCourseOrderPaymentKeys,
  platformMetricsKeys,
} from '@services/query';
import type { ApiError } from '@api';
import type {
  ApprovePaymentPayload,
  CollectionQuery,
  CourseOrderPayment,
  PaginatedResult,
  RejectPaymentPayload,
} from '@types';
import { platformCourseOrderPaymentService } from '../services/PlatformCourseOrderPaymentService';

/**
 * What an approve/reject of a COURSE payment changes beyond the review
 * queue: an approval marks the order paid, writes the academy's revenue
 * ledger (payouts, revenue summary, the academy's Orders page), counts as
 * paid access on the course and moves the platform commerce metrics and
 * analytics; a rejection moves the same order and metrics. Prefixes from
 * the query-key factory only.
 */
const COURSE_PAYMENT_DECISION_KEYS: readonly (readonly unknown[])[] = [
  platformCourseOrderPaymentKeys.all,
  platformMetricsKeys.all,
  analyticsKeys.all,
  academyPayoutKeys.all,
  academyCourseOrderKeys.all,
  platformAcademyPayoutKeys.all,
  platformAcademyKeys.all,
  platformCourseKeys.all,
];

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
    // Learners submit course payments from their own browsers; poll while
    // the review queue is shown (paused in background tabs).
    ...LIVE_LIST_QUERY_OPTIONS,
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
      await Promise.all(
        COURSE_PAYMENT_DECISION_KEYS.map((key) => invalidate(key))
      );
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
      await Promise.all(
        COURSE_PAYMENT_DECISION_KEYS.map((key) => invalidate(key))
      );
    },
  });
}
