/**
 * useCourses hook.
 *
 * Fetches a page of courses for an academy using TanStack Query.
 */
import { useApiQuery } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import { courseService } from '../services/CourseService';
import type { Course, CourseListQuery, PaginatedResult } from '@types';

export interface UseCoursesOptions {
  readonly query?: CourseListQuery;
  readonly enabled?: boolean;
}

export function useCourses(academyId: string, options?: UseCoursesOptions) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<Course>>({
    queryKey: courseKeys.list(academyId, query),
    queryFn: () => courseService.getCourses(academyId, query),
    enabled: enabled && !!academyId,
  });
}
