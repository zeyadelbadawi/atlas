/**
 * useDeleteAssignment hook.
 *
 * Phase 4 — mutation hook for deleting an assignment.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';

export function useDeleteAssignment(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (assignmentId) =>
      assignmentService.deleteAssignment(courseId, assignmentId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(assignmentKeys.authoringList(user?.id, courseId));
    },
  });
}
