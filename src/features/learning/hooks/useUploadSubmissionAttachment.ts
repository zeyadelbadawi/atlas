/**
 * useUploadSubmissionAttachment hook.
 *
 * Phase 4 — uploads a real file for the current student's upcoming
 * assignment submission through the existing R2 media pipeline, returning
 * its real, permanent URL. Replaces the previous
 * `FileReader.readAsDataURL` base64-in-database approach: `AssignmentPage`
 * calls this first, then passes the returned `url` as `attachmentUrl` to
 * `useSubmitAssignment` — the same "upload, then reference the resulting
 * URL" flow `useUploadMediaAsset` already established for the academy
 * media library.
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { assignmentService } from '../services/AssignmentService';
import type { MediaAssetDetail, UploadMediaAssetPayload } from '@types';

export interface UploadSubmissionAttachmentVariables {
  readonly courseId: string;
  readonly assignmentId: string;
  readonly payload: UploadMediaAssetPayload;
}

export function useUploadSubmissionAttachment() {
  return useApiMutation<
    MediaAssetDetail,
    UploadSubmissionAttachmentVariables,
    ApiError
  >({
    mutationFn: ({ courseId, assignmentId, payload }) =>
      assignmentService.uploadSubmissionAttachment(
        courseId,
        assignmentId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
