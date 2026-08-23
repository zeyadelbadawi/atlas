/**
 * useUpdateSupportCaseStatus hook.
 *
 * Not auto-retried — a failed status change must be visibly retried by
 * the agent, never silently repeated.
 */
import { useApiMutation } from '@/shared/hooks';
import { supportKeys } from '@services/query';
import { supportService } from '../services/SupportService';
import type { ApiError } from '@api';
import type { SupportCaseDetail, UpdateSupportCaseStatusPayload } from '@types';

export interface UpdateSupportCaseStatusVariables {
  readonly caseId: string;
  readonly payload: UpdateSupportCaseStatusPayload;
}

export function useUpdateSupportCaseStatus() {
  return useApiMutation<SupportCaseDetail, UpdateSupportCaseStatusVariables, ApiError>({
    mutationFn: ({ caseId, payload }) => supportService.updateStatus(caseId, payload),
    successMessageKey: 'support:detail.statusUpdated',
    invalidateKeys: [supportKeys.all],
  });
}
