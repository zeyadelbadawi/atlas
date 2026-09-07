/**
 * usePublicCourses hook — `FeaturedCoursesSection`/`InstructorsSection`'s
 * real, public, published-only course list. Parallel to
 * `usePublicWebsiteStatistics` — see `PublicWebsiteService.getPublicCourses`'s
 * own doc comment for why these two sections needed a public-safe fetch
 * path instead of the tenant-scoped `useCourses` (`@features/course`).
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '../services/PublicWebsiteService';
import type { Course, CourseListQuery, PaginatedResult } from '@types';
import type { ApiError } from '@api';

export interface UsePublicCoursesOptions {
  readonly query?: CourseListQuery;
  readonly enabled?: boolean;
}

export function usePublicCourses(
  academyId: string | undefined,
  options?: UsePublicCoursesOptions
) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<Course> | null, ApiError>({
    queryKey: publicWebsiteKeys.courses(academyId, query),
    queryFn: () => publicWebsiteService.getPublicCourses(academyId!, query),
    enabled: enabled && !!academyId,
  });
}
