/**
 * useCourseContent hook.
 *
 * Fetches a course's curriculum (sections + published lessons) through
 * the student-facing, enrollment-gated `CourseContentService` — see that
 * service's own doc comment for why this exists alongside (never
 * replacing) `@features/course`'s `useCourseSections`.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { courseContentKeys } from '@services/query';
import { courseContentService } from '../services/CourseContentService';
import type { CourseSection, PaginatedResult } from '@types';

export interface UseCourseContentOptions {
  readonly enabled?: boolean;
}

export function useCourseContent(
  courseId: string,
  options?: UseCourseContentOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<CourseSection>>({
    queryKey: courseContentKeys.sections(user?.id, courseId),
    queryFn: () => courseContentService.getSections(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
