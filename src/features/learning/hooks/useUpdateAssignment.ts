/**
 * useUpdateAssignment hook.
 *
 * Phase 4 — mutation hook for updating an assignment.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';
import type { Assignment, UpdateAssignmentPayload } from '@types';

export interface UpdateAssignmentVariables {
  readonly assignmentId: string;
  readonly payload: UpdateAssignmentPayload;
}

export function useUpdateAssignment(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<Assignment, UpdateAssignmentVariables, ApiError>({
    mutationFn: ({ assignmentId, payload }) =>
      assignmentService.updateAssignment(courseId, assignmentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_result, { assignmentId }) => {
      await invalidate(assignmentKeys.authoringList(user?.id, courseId));
      await invalidate(
        assignmentKeys.authoringDetail(user?.id, courseId, assignmentId)
      );
    },
  });
}
