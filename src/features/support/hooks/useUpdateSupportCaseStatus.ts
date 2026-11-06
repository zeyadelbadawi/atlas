/**
 * useUpdateSupportCaseStatus hook.
 *
 * Not auto-retried — a failed status change must be visibly retried by
 * the agent, never silently repeated.
 */
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, supportKeys } from '@services/query';
import { supportService } from '../services/SupportService';
import type { ApiError } from '@api';
import type { SupportCaseDetail, UpdateSupportCaseStatusPayload } from '@types';

export interface UpdateSupportCaseStatusVariables {
  readonly caseId: string;
  readonly payload: UpdateSupportCaseStatusPayload;
}

export function useUpdateSupportCaseStatus() {
  return useApiMutation<
    SupportCaseDetail,
    UpdateSupportCaseStatusVariables,
    ApiError
  >({
    mutationFn: ({ caseId, payload }) =>
      supportService.updateStatus(caseId, payload),
    // B8 (UX audit) V14/V20/V21 — the case page shows the one message
    // (and the success) itself.
    showSuccessToast: false,
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
    invalidateKeys: [supportKeys.all],
  });
}
