/**
 * useCourse hook.
 *
 * Fetches a single course by id using TanStack Query.
 */
import { useApiQuery } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import { courseService } from '../services/CourseService';
import type { Course } from '@types';

export interface UseCourseOptions {
  readonly enabled?: boolean;
}

export function useCourse(
  academyId: string,
  courseId: string,
  options?: UseCourseOptions
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<Course>({
    queryKey: courseKeys.detail(academyId, courseId),
    queryFn: () => courseService.getCourse(academyId, courseId),
    enabled: enabled && !!academyId && !!courseId,
  });
}
