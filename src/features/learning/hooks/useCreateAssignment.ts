/**
 * useCreateAssignment hook.
 *
 * Phase 4 — mutation hook for creating an assignment.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';
import type { Assignment, CreateAssignmentPayload } from '@types';

export function useCreateAssignment(courseId: string) {
  const queryClient = useQueryClient();

  return useApiMutation<Assignment, CreateAssignmentPayload, ApiError>({
    mutationFn: (payload) =>
      assignmentService.createAssignment(courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      // Authoring list + the course builder (unit rows, attach picker).
      await invalidateCourseCurriculum(queryClient, { courseId });
    },
  });
}
