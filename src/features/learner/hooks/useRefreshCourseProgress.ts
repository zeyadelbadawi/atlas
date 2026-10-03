/**
 * Everything that reads a learner's progress in one course, refreshed
 * together after anything is finished (Task C/E).
 *
 * A finished lesson, a submitted quiz or assignment changes several
 * readers at once: the sequence (what is unlocked, what is next), the
 * completion evaluation (is the course done, is a certificate coming),
 * and the Start / Continue / Completed labels on My Courses, the overview
 * and the course page. Refreshing them separately is how a quiz finished
 * as the last activity left the player on a stale sequence with no way
 * forward — only the quiz's own attempts were refetched.
 */
import { useCallback } from 'react';
import { useAuth, useInvalidate } from '@hooks';
import {
  certificateKeys,
  completionKeys,
  enrollmentKeys,
  learnerKeys,
  progressKeys,
} from '@services/query';

export function useRefreshCourseProgress(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useCallback(async () => {
    await Promise.all([
      invalidate(progressKeys.course(user?.id, courseId)),
      invalidate(learnerKeys.sequence(user?.id, courseId)),
      invalidate(completionKeys.course(user?.id, courseId)),
      invalidate(enrollmentKeys.course(user?.id, courseId)),
      invalidate([...enrollmentKeys.all, 'list']),
      invalidate([...learnerKeys.all, 'overview']),
      invalidate(certificateKeys.all),
    ]);
  }, [invalidate, user?.id, courseId]);
}
