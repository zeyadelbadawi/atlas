/**
 * useMyCourseReview / useSubmitMyReview / useDeleteMyReview (P64 Phase 4)
 * — the authenticated learner's own review of a course. Reads/writes the
 * caller's single review; every write re-enters moderation on the backend,
 * so these show no "approved" messaging (the form owns "submitted for
 * review" copy). On success they invalidate the learner's own review and
 * the public rating/reviews so the details page reflects the change.
 */
import {
  useApiMutation,
  useApiQuery,
  useAuth,
  useInvalidate,
} from '@/shared/hooks';
import { courseReviewKeys, publicWebsiteKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseReviewService } from '../services/CourseReviewService';
import type {
  CourseReview,
  CreateCourseReviewPayload,
  UpdateCourseReviewPayload,
} from '@types';

export function useMyCourseReview(
  courseId: string | undefined,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<CourseReview | null, ApiError>({
    queryKey: courseReviewKeys.mine(user?.id, courseId),
    queryFn: () => courseReviewService.getMyReview(courseId!),
    enabled: enabled && !!user?.id && !!courseId,
  });
}

function useInvalidateReviewSurfaces(
  academyId: string | undefined,
  courseId: string
) {
  const { invalidate } = useInvalidate();
  return async () => {
    await invalidate(courseReviewKeys.all);
    await invalidate(publicWebsiteKeys.courseRating(academyId, courseId));
    // The approved-reviews list uses a query-bearing key; invalidate the
    // whole public-website root prefix for this course's reviews.
    await invalidate(publicWebsiteKeys.all);
  };
}

export function useSubmitMyReview(
  courseId: string,
  academyId: string | undefined
) {
  const invalidateSurfaces = useInvalidateReviewSurfaces(academyId, courseId);

  return useApiMutation<
    CourseReview,
    {
      create: boolean;
      payload: CreateCourseReviewPayload | UpdateCourseReviewPayload;
    },
    ApiError
  >({
    mutationFn: ({ create, payload }) =>
      create
        ? courseReviewService.createMyReview(
            courseId,
            payload as CreateCourseReviewPayload
          )
        : courseReviewService.updateMyReview(
            courseId,
            payload as UpdateCourseReviewPayload
          ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: invalidateSurfaces,
  });
}

export function useDeleteMyReview(
  courseId: string,
  academyId: string | undefined
) {
  const invalidateSurfaces = useInvalidateReviewSurfaces(academyId, courseId);

  return useApiMutation<void, void, ApiError>({
    mutationFn: () => courseReviewService.deleteMyReview(courseId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: invalidateSurfaces,
  });
}
