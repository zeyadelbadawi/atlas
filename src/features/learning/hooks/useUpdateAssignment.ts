/**
 * useUpdateAssignment hook.
 *
 * Phase 4 — mutation hook for updating an assignment.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';
import type { Assignment, UpdateAssignmentPayload } from '@types';
import { INLINE_ERRORS_META } from '@services/query';

export interface UpdateAssignmentVariables {
  readonly assignmentId: string;
  readonly payload: UpdateAssignmentPayload;
}

export function useUpdateAssignment(courseId: string) {
  const { invalidate } = useInvalidate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useApiMutation<Assignment, UpdateAssignmentVariables, ApiError>({
    mutationFn: ({ assignmentId, payload }) =>
      assignmentService.updateAssignment(courseId, assignmentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    // B3 (V05) — the authoring screen shows the failure itself; the
    // app-wide reporter must not add a second message.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_result, { assignmentId }) => {
      // Authoring list + the course builder (unit row title/status, picker).
      await invalidateCourseCurriculum(queryClient, { courseId });
      await invalidate(
        assignmentKeys.authoringDetail(user?.id, courseId, assignmentId)
      );
    },
  });
}
