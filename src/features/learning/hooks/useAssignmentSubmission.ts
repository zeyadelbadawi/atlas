/**
 * useAssignmentSubmission hook.
 *
 * Fetches the current student's submission for an assignment, if any.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import { assignmentService } from '../services/AssignmentService';
import type { AssignmentSubmission } from '@types';

export interface UseAssignmentSubmissionOptions {
  readonly enabled?: boolean;
}

export function useAssignmentSubmission(
  courseId: string,
  assignmentId: string,
  options?: UseAssignmentSubmissionOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<AssignmentSubmission | null>({
    queryKey: assignmentKeys.submission(user?.id, courseId, assignmentId),
    queryFn: () => assignmentService.getSubmission(courseId, assignmentId),
    enabled: enabled && !!user?.id && !!courseId && !!assignmentId,
  });
}
