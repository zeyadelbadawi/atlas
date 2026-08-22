/**
 * useDiscoverCourse hook.
 *
 * Fetches a single published course by id alone (no academy id required),
 * for the course details page reached before a student has enrolled.
 */
import { useApiQuery } from '@/shared/hooks';
import { courseDiscoveryKeys } from '@services/query';
import { courseService } from '@features/course';
import type { Course } from '@types';

export interface UseDiscoverCourseOptions {
  readonly enabled?: boolean;
}

export function useDiscoverCourse(
  courseId: string,
  options?: UseDiscoverCourseOptions
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<Course>({
    queryKey: [...courseDiscoveryKeys.all, 'detail', courseId],
    queryFn: () => courseService.discoverCourse(courseId),
    enabled: enabled && !!courseId,
  });
}
