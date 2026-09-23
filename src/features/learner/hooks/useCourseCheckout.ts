/**
 * Course checkout hooks (P64 Phase 4) — the learner's paid-course purchase
 * flow over the `course-orders` API: open an order, create a manual-review
 * payment, upload a transfer proof for review, and read the order/payment
 * back. Proof is sent as a base64 data URL (the same shape tenant billing
 * uses), so no new upload endpoint is involved. Success invalidates the
 * caller's orders so `/my/purchases` reflects the new pending order.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { courseOrderKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseOrderService } from '../services/CourseOrderService';
import type { CourseOrder, CourseOrderPayment } from '@types';

/** Reads a File as a base64 data URL — the proof wire shape (see billing). */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useCourseOrder(orderId: string | undefined) {
  return useApiQuery<CourseOrder, ApiError>({
    queryKey: courseOrderKeys.detail(orderId),
    queryFn: () => courseOrderService.getOrder(orderId!),
    enabled: !!orderId,
  });
}

export function useCourseOrderPayment(
  orderId: string | undefined,
  paymentId: string | undefined,
  options?: { refetchInterval?: number }
) {
  return useApiQuery<CourseOrderPayment, ApiError>({
    queryKey: courseOrderKeys.payment(orderId, paymentId),
    queryFn: () => courseOrderService.getPayment(orderId!, paymentId!),
    enabled: !!orderId && !!paymentId,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateCourseOrder() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    CourseOrder,
    { courseId: string; idempotencyKey: string },
    ApiError
  >({
    mutationFn: ({ courseId, idempotencyKey }) =>
      courseOrderService.createOrder(courseId, { idempotencyKey }),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseOrderKeys.all);
    },
  });
}

export function useCreateCoursePayment(orderId: string) {
  return useApiMutation<CourseOrderPayment, { methodKey: string }, ApiError>({
    mutationFn: ({ methodKey }) =>
      courseOrderService.createPayment(orderId, { methodKey }),
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export function useSubmitCourseOrderProof(orderId: string) {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    CourseOrderPayment,
    { paymentId: string; file: File; note?: string },
    ApiError
  >({
    mutationFn: async ({ paymentId, file, note }) => {
      const fileData = await readFileAsDataUrl(file);
      return courseOrderService.submitProof(orderId, paymentId, {
        fileName: file.name,
        fileData,
        note,
      });
    },
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(courseOrderKeys.payment(orderId, variables.paymentId));
      await invalidate(courseOrderKeys.all);
    },
  });
}
