/**
 * useUpdateContactSubmissionStatus hook — mark read/unread, archive,
 * restore. One PATCH; every message list of the Academy and its summary
 * counts are refreshed afterwards, since a status change moves a message
 * between status tabs and changes the counts.
 *
 * Toasts are the caller's: the same mutation backs a silent "opened, so
 * read" and explicit actions that confirm what happened.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { INLINE_ERRORS_META, websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { ContactSubmission, ContactSubmissionStatus } from '@types';
import { contactSubmissionService } from '../services/ContactSubmissionService';

export interface UpdateContactSubmissionStatusVariables {
  readonly academyId: string;
  readonly submissionId: string;
  readonly status: ContactSubmissionStatus;
}

export function useUpdateContactSubmissionStatus() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    ContactSubmission,
    UpdateContactSubmissionStatusVariables,
    ApiError
  >({
    mutationFn: ({ academyId, submissionId, status }) =>
      contactSubmissionService.updateStatus(academyId, submissionId, {
        status,
      }),
    showSuccessToast: false,
    showErrorToast: false,
    // B2 (UX audit) — the messages page raises its own failure toast with
    // the reason; the app-wide reporter used to add a second one.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        invalidate(websiteKeys.allContactSubmissions(variables.academyId)),
        invalidate(websiteKeys.contactSubmissionSummary(variables.academyId)),
      ]);
    },
  });
}
