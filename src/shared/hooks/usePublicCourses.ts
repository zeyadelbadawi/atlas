/**
 * usePublicCourses hook — `FeaturedCoursesSection`/`InstructorsSection`'s
 * real, public, published-only course list. Parallel to
 * `usePublicWebsiteStatistics` — see `PublicWebsiteService.getPublicCourses`'s
 * own doc comment for why these two sections needed a public-safe fetch
 * path instead of the tenant-scoped `useCourses` (`@features/course`).
 */
import { useApiQuery } from '@/shared/hooks';
import { INLINE_ERRORS_META, publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type { Course, CourseListQuery, PaginatedResult } from '@types';
import type { ApiError } from '@api';

/** B9 (UX audit) — the public site draws its own state for a failed read; the app-wide toast would only repeat it. */
const PUBLIC_READ_META = { [INLINE_ERRORS_META]: true } as const;

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
    meta: PUBLIC_READ_META,
    queryKey: publicWebsiteKeys.courses(academyId, query),
    queryFn: () => publicWebsiteService.getPublicCourses(academyId!, query),
    enabled: enabled && !!academyId,
  });
}
