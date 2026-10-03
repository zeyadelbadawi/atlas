/**
 * useDeleteAssignment hook.
 *
 * Phase 4 — mutation hook for deleting an assignment.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';

export function useDeleteAssignment(courseId: string) {
  const queryClient = useQueryClient();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (assignmentId) =>
      assignmentService.deleteAssignment(courseId, assignmentId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      // Authoring list + the course builder (unit rows, attach picker).
      await invalidateCourseCurriculum(queryClient, { courseId });
    },
  });
}
