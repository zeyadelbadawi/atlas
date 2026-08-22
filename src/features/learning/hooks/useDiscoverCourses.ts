/**
 * useDiscoverCourses hook.
 *
 * Fetches the cross-academy catalog of published, publicly visible courses
 * using TanStack Query.
 */
import { useApiQuery } from '@/shared/hooks';
import { courseDiscoveryKeys } from '@services/query';
import { courseService } from '@features/course';
import type { Course, CourseListQuery, PaginatedResult } from '@types';

export interface UseDiscoverCoursesOptions {
  readonly query?: CourseListQuery;
  readonly enabled?: boolean;
}

export function useDiscoverCourses(options?: UseDiscoverCoursesOptions) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<Course>>({
    queryKey: courseDiscoveryKeys.list(query),
    queryFn: () => courseService.discoverCourses(query),
    enabled,
  });
}
