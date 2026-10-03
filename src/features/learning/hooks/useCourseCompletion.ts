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
  /**
   * Re-reads while a certificate is being issued (the completion page),
   * from the data just read — `false` stops it.
   */
  readonly refetchInterval?: (
    data: CourseCompletion | undefined
  ) => number | false;
  /** Always re-read on mount (the completion page must not show a stale verdict). */
  readonly fresh?: boolean;
}

export function useCourseCompletion(
  courseId: string,
  options?: UseCourseCompletionOptions
) {
  const { enabled = true, refetchInterval, fresh = false } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<CourseCompletion, ApiError>({
    queryKey: completionKeys.course(user?.id, courseId),
    queryFn: () => completionService.getCourseCompletion(courseId),
    enabled: enabled && !!user?.id && !!courseId,
    ...(refetchInterval
      ? { refetchInterval: (query) => refetchInterval(query.state.data) }
      : {}),
    ...(fresh ? { refetchOnMount: 'always' as const, staleTime: 0 } : {}),
  });
}
