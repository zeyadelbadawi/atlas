/**
 * useInstructorSubmission hook.
 *
 * Fetches one submission for review.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import { instructorService } from '../services/InstructorService';
import type { AssignmentSubmissionReview } from '@types';

export interface UseInstructorSubmissionOptions {
  readonly enabled?: boolean;
}

export function useInstructorSubmission(
  courseId: string,
  assignmentId: string,
  submissionId: string,
  options?: UseInstructorSubmissionOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<AssignmentSubmissionReview>({
    queryKey: instructorKeys.submission(
      user?.id,
      courseId,
      assignmentId,
      submissionId
    ),
    queryFn: () =>
      instructorService.getSubmission(courseId, assignmentId, submissionId),
    enabled:
      enabled && !!user?.id && !!courseId && !!assignmentId && !!submissionId,
  });
}
