/**
 * useCourseCategories hook.
 *
 * Fetches an academy's course categories using TanStack Query.
 */
import { useApiQuery } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import { courseService } from '../services/CourseService';
import type { CourseCategory, PaginatedResult } from '@types';

export interface UseCourseCategoriesOptions {
  readonly enabled?: boolean;
}

export function useCourseCategories(
  academyId: string,
  options?: UseCourseCategoriesOptions
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<CourseCategory>>({
    queryKey: courseKeys.categories(academyId),
    queryFn: () => courseService.getCourseCategories(academyId),
    enabled: enabled && !!academyId,
  });
}
