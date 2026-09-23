/**
 * usePublicCourseReviews / usePublicCourseRating /
 * usePublicCourseRecommendations — the Course Details page's public,
 * unauthenticated review, rating and related-course data (P64 Phase 4).
 * Same not-found→null convention as `usePublicCourse`.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type {
  CollectionQuery,
  Course,
  CourseRatingSummary,
  CourseReview,
  PaginatedResult,
} from '@types';
import type { ApiError } from '@api';

export function usePublicCourseReviews(
  academyId: string | undefined,
  courseId: string | undefined,
  query?: CollectionQuery
) {
  return useApiQuery<PaginatedResult<CourseReview> | null, ApiError>({
    queryKey: publicWebsiteKeys.courseReviews(academyId, courseId, query),
    queryFn: () =>
      publicWebsiteService.getPublicCourseReviews(academyId!, courseId!, query),
    enabled: !!academyId && !!courseId,
  });
}

export function usePublicCourseRating(
  academyId: string | undefined,
  courseId: string | undefined
) {
  return useApiQuery<CourseRatingSummary | null, ApiError>({
    queryKey: publicWebsiteKeys.courseRating(academyId, courseId),
    queryFn: () =>
      publicWebsiteService.getPublicCourseRating(academyId!, courseId!),
    enabled: !!academyId && !!courseId,
  });
}

export function usePublicCourseRecommendations(
  academyId: string | undefined,
  courseId: string | undefined
) {
  return useApiQuery<readonly Course[] | null, ApiError>({
    queryKey: publicWebsiteKeys.courseRecommendations(academyId, courseId),
    queryFn: () =>
      publicWebsiteService.getPublicCourseRecommendations(
        academyId!,
        courseId!
      ),
    enabled: !!academyId && !!courseId,
  });
}
