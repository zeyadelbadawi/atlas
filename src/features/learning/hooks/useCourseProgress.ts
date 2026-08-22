/**
 * useCourseProgress hook.
 *
 * Fetches the current student's progress through a course using TanStack
 * Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { progressKeys } from '@services/query';
import { progressService } from '../services/ProgressService';
import type { CourseProgress } from '@types';

export interface UseCourseProgressOptions {
  readonly enabled?: boolean;
}

export function useCourseProgress(
  courseId: string,
  options?: UseCourseProgressOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<CourseProgress>({
    queryKey: progressKeys.course(user?.id, courseId),
    queryFn: () => progressService.getCourseProgress(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
