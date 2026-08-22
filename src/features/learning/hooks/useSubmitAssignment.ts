/**
 * useSubmitAssignment hook.
 *
 * Mutation hook for creating or resubmitting an assignment submission.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { assignmentKeys, progressKeys } from '@services/query';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';
import type {
  AssignmentSubmission,
  CreateAssignmentSubmissionPayload,
} from '@types';

export function useSubmitAssignment(courseId: string, assignmentId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<
    AssignmentSubmission,
    CreateAssignmentSubmissionPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      assignmentService.submitAssignment(courseId, assignmentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(
        assignmentKeys.submission(user?.id, courseId, assignmentId)
      );
      await invalidate(progressKeys.course(user?.id, courseId));
    },
  });
}
