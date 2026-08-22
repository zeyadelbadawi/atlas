/**
 * useInstructorCourseOverview hook.
 *
 * Fetches the teaching-operations overview for one authorized course.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import { instructorService } from '../services/InstructorService';
import type { InstructorCourseOverview } from '@types';

export interface UseInstructorCourseOverviewOptions {
  readonly enabled?: boolean;
}

export function useInstructorCourseOverview(
  courseId: string,
  options?: UseInstructorCourseOverviewOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<InstructorCourseOverview>({
    queryKey: instructorKeys.course(user?.id, courseId),
    queryFn: () => instructorService.getCourseOverview(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
