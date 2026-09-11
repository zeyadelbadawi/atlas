/**
 * useMySupportCases / useMySupportCase / useReplyToMySupportCase /
 * useCreateSupportCase — the TENANT side of support.
 *
 * Separate from the Platform-Owner hooks in this folder, and pointed at
 * the requester-scoped routes. Reusing the operator hooks for a tenant
 * would send a customer's request to a route they are correctly refused
 * from, and would share a query cache between cross-tenant and
 * own-tickets views.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { supportKeys } from '@services/query';
import { mySupportService } from '../services/SupportService';
import type {
  CollectionQuery,
  CreateSupportCasePayload,
  PaginatedResult,
  PostSupportCaseReplyPayload,
  SupportCaseDetail,
  SupportCaseSummary,
} from '@types';
import type { ApiError } from '@api';

export function useMySupportCases(
  organizationId: string | undefined,
  query?: CollectionQuery
) {
  return useApiQuery<PaginatedResult<SupportCaseSummary>, ApiError>({
    queryKey: supportKeys.mineList(organizationId, query),
    queryFn: () => mySupportService.getMyCases(organizationId!, query),
    enabled: !!organizationId,
  });
}

export function useMySupportCase(caseId: string) {
  return useApiQuery<SupportCaseDetail, ApiError>({
    queryKey: supportKeys.mineDetail(caseId),
    queryFn: () => mySupportService.getMyCase(caseId),
    enabled: !!caseId,
  });
}

export interface CreateSupportCaseVariables {
  readonly organizationId: string;
  readonly payload: CreateSupportCasePayload;
}

export function useCreateSupportCase() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    SupportCaseDetail,
    CreateSupportCaseVariables,
    ApiError
  >({
    mutationFn: ({ organizationId, payload }) =>
      mySupportService.createCase(organizationId, payload),
    // The page reports the outcome in context and navigates to the new
    // ticket, so a generic toast would be a second message for one event.
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(supportKeys.all);
    },
  });
}

export interface ReplyToMySupportCaseVariables {
  readonly caseId: string;
  readonly payload: PostSupportCaseReplyPayload;
}

export function useReplyToMySupportCase() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    SupportCaseDetail,
    ReplyToMySupportCaseVariables,
    ApiError
  >({
    mutationFn: ({ caseId, payload }) =>
      mySupportService.replyToMyCase(caseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { caseId }) => {
      // Both the thread and the list's "last activity" column change.
      await invalidate(supportKeys.mineDetail(caseId));
      await invalidate(supportKeys.all);
    },
  });
}
