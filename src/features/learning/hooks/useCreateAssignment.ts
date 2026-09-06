/**
 * useCreateAssignment hook.
 *
 * Phase 4 — mutation hook for creating an assignment.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';
import type { Assignment, CreateAssignmentPayload } from '@types';

export function useCreateAssignment(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<Assignment, CreateAssignmentPayload, ApiError>({
    mutationFn: (payload) =>
      assignmentService.createAssignment(courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(assignmentKeys.authoringList(user?.id, courseId));
    },
  });
}
