/**
 * The learner's self-service course refund (backend P13).
 *
 * `useCourseOrderRefund` reads the refund recorded against one order; the
 * endpoint answers `null` rather than 404 when there is none. The purchases
 * page only asks for it on orders already `refunded`, so a list of paid
 * receipts never fans out into one request per row.
 *
 * `useRequestCourseOrderRefund` is the write. It shows no toast: the dialog
 * that asked for it reports failure in place (where the learner is looking)
 * and closes on success, and the row then re-renders as refunded. On success
 * it invalidates the course-order tree (the order's status changed and its
 * refund now exists) AND the learner and enrollment trees — the refund
 * revoked this learner's enrollment, so "My courses", the overview and any
 * cached enrollment state are now stale too.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@hooks';
import { courseOrderKeys, enrollmentKeys, learnerKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  CourseOrderRefund,
  RequestCourseOrderRefundPayload,
} from '@types';
import { courseOrderService } from '../services/CourseOrderService';

export interface UseCourseOrderRefundOptions {
  readonly enabled?: boolean;
}

export function useCourseOrderRefund(
  orderId: string | undefined,
  options?: UseCourseOrderRefundOptions
) {
  const { enabled = true } = options ?? {};
  return useApiQuery<CourseOrderRefund | null, ApiError>({
    queryKey: courseOrderKeys.refund(orderId),
    queryFn: () => courseOrderService.getRefund(orderId!),
    enabled: enabled && !!orderId,
  });
}

export interface RequestCourseOrderRefundVariables extends RequestCourseOrderRefundPayload {
  readonly orderId: string;
}

export function useRequestCourseOrderRefund() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    CourseOrderRefund,
    RequestCourseOrderRefundVariables,
    ApiError
  >({
    mutationFn: ({ orderId, idempotencyKey, reason }) =>
      courseOrderService.requestRefund(orderId, {
        idempotencyKey,
        ...(reason ? { reason } : {}),
      }),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await Promise.all([
        invalidate(courseOrderKeys.all),
        invalidate(learnerKeys.all),
        invalidate(enrollmentKeys.all),
      ]);
    },
  });
}
