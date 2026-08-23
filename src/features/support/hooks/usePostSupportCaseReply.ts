/**
 * usePostSupportCaseReply hook.
 *
 * Not auto-retried — a failed reply must be visibly resent by the agent,
 * never silently replayed.
 */
import { useApiMutation } from '@/shared/hooks';
import { supportKeys } from '@services/query';
import { supportService } from '../services/SupportService';
import type { ApiError } from '@api';
import type { PostSupportCaseReplyPayload, SupportCaseDetail } from '@types';

export interface PostSupportCaseReplyVariables {
  readonly caseId: string;
  readonly payload: PostSupportCaseReplyPayload;
}

export function usePostSupportCaseReply() {
  return useApiMutation<SupportCaseDetail, PostSupportCaseReplyVariables, ApiError>({
    mutationFn: ({ caseId, payload }) => supportService.postReply(caseId, payload),
    showSuccessToast: false,
    invalidateKeys: [supportKeys.all],
  });
}
