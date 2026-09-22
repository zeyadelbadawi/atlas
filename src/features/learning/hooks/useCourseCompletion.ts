/**
 * useCourseCompletion — the learner's evaluated completion state (AD-11).
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { completionKeys } from '@services/query';
import type { ApiError } from '@api';
import { completionService } from '../services/CompletionService';
import type { CourseCompletion } from '@types';

export interface UseCourseCompletionOptions {
  readonly enabled?: boolean;
}

export function useCourseCompletion(
  courseId: string,
  options?: UseCourseCompletionOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<CourseCompletion, ApiError>({
    queryKey: completionKeys.course(user?.id, courseId),
    queryFn: () => completionService.getCourseCompletion(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
