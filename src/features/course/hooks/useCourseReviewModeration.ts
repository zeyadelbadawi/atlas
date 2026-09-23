/**
 * Course review moderation hooks (P64 Phase 4) — the staff list + approve/
 * reject/remove actions. Mutations invalidate the moderation list and the
 * public reviews/rating so both the dashboard and the public page reflect
 * the decision.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { courseReviewKeys, publicWebsiteKeys } from '@services/query';
import type { ApiError } from '@api';
import {
  courseReviewModerationService,
  type ModerationReviewQuery,
} from '../services/CourseReviewModerationService';
import type { CourseReview, PaginatedResult } from '@types';

export function useCourseReviewModeration(
  courseId: string | undefined,
  query?: ModerationReviewQuery,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  return useApiQuery<PaginatedResult<CourseReview>, ApiError>({
    queryKey: courseReviewKeys.moderation(courseId, query),
    queryFn: () => courseReviewModerationService.list(courseId!, query),
    enabled: enabled && !!courseId,
  });
}

function useInvalidateModeration(courseId: string) {
  const { invalidate } = useInvalidate();
  return async () => {
    await invalidate(courseReviewKeys.all);
    // The public reviews/rating for this course also change on a decision.
    await invalidate(publicWebsiteKeys.all);
  };
}

export function useModerateReview(courseId: string) {
  const invalidateAll = useInvalidateModeration(courseId);
  return useApiMutation<
    CourseReview,
    { reviewId: string; action: 'approve' | 'reject' },
    ApiError
  >({
    mutationFn: ({ reviewId, action }) =>
      action === 'approve'
        ? courseReviewModerationService.approve(courseId, reviewId)
        : courseReviewModerationService.reject(courseId, reviewId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: invalidateAll,
  });
}

export function useRemoveReview(courseId: string) {
  const invalidateAll = useInvalidateModeration(courseId);
  return useApiMutation<void, { reviewId: string }, ApiError>({
    mutationFn: ({ reviewId }) =>
      courseReviewModerationService.remove(courseId, reviewId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: invalidateAll,
  });
}
