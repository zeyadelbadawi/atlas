/**
 * usePostSupportCaseReply hook.
 *
 * Not auto-retried — a failed reply must be visibly resent by the agent,
 * never silently replayed.
 */
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, supportKeys } from '@services/query';
import { supportService } from '../services/SupportService';
import type { ApiError } from '@api';
import type { PostSupportCaseReplyPayload, SupportCaseDetail } from '@types';

export interface PostSupportCaseReplyVariables {
  readonly caseId: string;
  readonly payload: PostSupportCaseReplyPayload;
}

export function usePostSupportCaseReply() {
  return useApiMutation<
    SupportCaseDetail,
    PostSupportCaseReplyVariables,
    ApiError
  >({
    mutationFn: ({ caseId, payload }) =>
      supportService.postReply(caseId, payload),
    // B8 (UX audit) V14/V20/V21 — the case page shows the one message
    // (and the success) itself.
    showSuccessToast: false,
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
    invalidateKeys: [supportKeys.all],
  });
}
