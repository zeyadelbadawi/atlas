/**
 * useSaveAssignmentDraft — draft autosave (P64 Phase 3, §D.4).
 *
 * Silent by design; the form shows "Draft saved". The submission query is
 * NOT invalidated on every save — the response already carries the saved
 * draft, and a refetch would reset the textarea the learner is typing in.
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';
import type { AssignmentSubmission, SaveAssignmentDraftPayload } from '@types';

export function useSaveAssignmentDraft(courseId: string, assignmentId: string) {
  return useApiMutation<
    AssignmentSubmission,
    SaveAssignmentDraftPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      assignmentService.saveDraft(courseId, assignmentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
