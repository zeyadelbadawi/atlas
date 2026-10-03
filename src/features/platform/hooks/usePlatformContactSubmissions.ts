/**
 * Platform Owner contact inbox hooks (TASK 7).
 *
 * The list, the status counts, a status change and a delete. Every
 * mutation invalidates the whole `platformContactSubmissionKeys.all`
 * prefix, so the list rows and the summary counts are always derived from
 * the same server state — a deleted enquiry that still showed in a count
 * would read as a failed action. Mutation feedback (toasts, Undo) is the
 * page's job, so the shared toast behaviour is switched off here.
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { platformContactSubmissionKeys } from '@services/query';
import type { ApiError } from '@api';
import type { PaginatedResult } from '@types';
import {
  platformContactSubmissionService,
  type PlatformContactSubmission,
  type PlatformContactSubmissionListQuery,
  type PlatformContactSubmissionStatus,
  type PlatformContactSubmissionSummary,
} from '../services/PlatformContactSubmissionService';

export function usePlatformContactSubmissions(
  query?: PlatformContactSubmissionListQuery
) {
  return useApiQuery<PaginatedResult<PlatformContactSubmission>, ApiError>({
    queryKey: platformContactSubmissionKeys.list(query),
    queryFn: () => platformContactSubmissionService.list(query),
    // Typing in search or flipping a filter keeps the previous rows on
    // screen instead of collapsing the table to a skeleton.
    placeholderData: keepPreviousData,
  });
}

export function usePlatformContactSubmissionSummary() {
  return useApiQuery<PlatformContactSubmissionSummary, ApiError>({
    queryKey: platformContactSubmissionKeys.summary(),
    queryFn: () => platformContactSubmissionService.summary(),
  });
}

export interface UpdatePlatformContactStatusVariables {
  readonly id: string;
  readonly status: PlatformContactSubmissionStatus;
}

export function useUpdatePlatformContactSubmissionStatus() {
  return useApiMutation<
    PlatformContactSubmission,
    UpdatePlatformContactStatusVariables,
    ApiError
  >({
    mutationFn: ({ id, status }) =>
      platformContactSubmissionService.updateStatus(id, status),
    invalidateKeys: [platformContactSubmissionKeys.all],
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export function useDeletePlatformContactSubmission() {
  return useApiMutation<void, string, ApiError>({
    mutationFn: (id) => platformContactSubmissionService.remove(id),
    invalidateKeys: [platformContactSubmissionKeys.all],
    showSuccessToast: false,
    showErrorToast: false,
  });
}
