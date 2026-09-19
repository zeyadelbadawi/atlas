/**
 * useCourseSequence hook.
 *
 * THE one ordered curriculum. The sidebar, Previous/Next and Continue are
 * three views of this array, which is why it is fetched once per course
 * and shared rather than re-derived per component — the bug this
 * endpoint exists to end (F3) was three lists disagreeing about what came
 * next.
 *
 * Refetched on window focus, and that is deliberate here where it is off
 * elsewhere: a learner who submits an assignment in a second tab, or
 * whose drip date passes while the player is open, comes back to a
 * sidebar that would otherwise still show the old state and a Next button
 * pointing at a lock.
 */
import { useApiQuery, useAuth } from '@hooks';
import { learnerKeys } from '@services/query';
import type { CourseSequenceResponse } from '@types';
import { lessonContentService } from '../services/LessonContentService';

export interface UseCourseSequenceOptions {
  readonly enabled?: boolean;
}

export function useCourseSequence(
  courseId: string,
  options?: UseCourseSequenceOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<CourseSequenceResponse>({
    queryKey: learnerKeys.sequence(user?.id, courseId),
    queryFn: () => lessonContentService.getSequence(courseId),
    enabled: enabled && !!user?.id && !!courseId,
    refetchOnWindowFocus: true,
  });
}
