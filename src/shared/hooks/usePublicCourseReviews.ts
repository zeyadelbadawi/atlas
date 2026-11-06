/**
 * usePublicCourseReviews / usePublicCourseRating /
 * usePublicCourseRecommendations — the Course Details page's public,
 * unauthenticated review, rating and related-course data (P64 Phase 4).
 * Same not-found→null convention as `usePublicCourse`.
 */
import { useApiQuery } from '@/shared/hooks';
import { INLINE_ERRORS_META, publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type {
  CollectionQuery,
  Course,
  CourseRatingSummary,
  CourseReview,
  PaginatedResult,
} from '@types';
import type { ApiError } from '@api';

/** B9 (UX audit) — the public site draws its own state for a failed read; the app-wide toast would only repeat it. */
const PUBLIC_READ_META = { [INLINE_ERRORS_META]: true } as const;

export function usePublicCourseReviews(
  academyId: string | undefined,
  courseId: string | undefined,
  query?: CollectionQuery
) {
  return useApiQuery<PaginatedResult<CourseReview> | null, ApiError>({
    meta: PUBLIC_READ_META,
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
    meta: PUBLIC_READ_META,
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
    meta: PUBLIC_READ_META,
    queryKey: publicWebsiteKeys.courseRecommendations(academyId, courseId),
    queryFn: () =>
      publicWebsiteService.getPublicCourseRecommendations(
        academyId!,
        courseId!
      ),
    enabled: !!academyId && !!courseId,
  });
}
