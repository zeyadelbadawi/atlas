/**
 * useCourseSections hook.
 *
 * Fetches a course's curriculum (sections with nested lessons) using
 * TanStack Query.
 */
import { useApiQuery } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import { courseService } from '../services/CourseService';
import type { CourseSection, PaginatedResult } from '@types';

export interface UseCourseSectionsOptions {
  readonly enabled?: boolean;
}

export function useCourseSections(
  academyId: string,
  courseId: string,
  options?: UseCourseSectionsOptions
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<CourseSection>>({
    queryKey: courseKeys.sections(academyId, courseId),
    queryFn: () => courseService.getCourseSections(academyId, courseId),
    enabled: enabled && !!academyId && !!courseId,
  });
}
