/**
 * B0-SEC-13 — query hooks for the person's own privacy requests and the
 * Platform Owner queue. Mutations invalidate the whole `privacy-requests`
 * prefix so the list and the detail never disagree.
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import { privacyRequestKeys } from '@services/query';
import type { ApiError } from '@api';
import type { PaginatedResult } from '@types';
import { privacyRequestService } from '../services/PrivacyRequestService';
import { platformPrivacyRequestService } from '../services/PlatformPrivacyRequestService';
import type {
  MyPrivacyRequest,
  PlatformPrivacyRequest,
  PlatformPrivacyRequestListQuery,
  PrivacyRequestType,
} from '../types';

export function useMyPrivacyRequests() {
  return useApiQuery<readonly MyPrivacyRequest[], ApiError>({
    queryKey: privacyRequestKeys.mine(),
    queryFn: () => privacyRequestService.listMine(),
  });
}

export function useFilePrivacyRequest() {
  return useApiMutation<
    MyPrivacyRequest,
    { type: PrivacyRequestType; challengeId: string; code: string },
    ApiError
  >({
    mutationFn: (input) => privacyRequestService.file(input),
    invalidateKeys: [privacyRequestKeys.all],
    // The card and the page show the error where it happened.
    showErrorToast: false,
  });
}

export function usePlatformPrivacyRequests(
  query?: PlatformPrivacyRequestListQuery
) {
  return useApiQuery<PaginatedResult<PlatformPrivacyRequest>, ApiError>({
    queryKey: privacyRequestKeys.platformList(query),
    queryFn: () => platformPrivacyRequestService.list(query),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}

export function usePlatformPrivacyRequest(requestId: string | undefined) {
  return useApiQuery<PlatformPrivacyRequest, ApiError>({
    queryKey: privacyRequestKeys.platformDetail(requestId ?? ''),
    queryFn: () => platformPrivacyRequestService.get(requestId ?? ''),
    enabled: !!requestId,
  });
}

export function useUpdatePrivacyRequestStatus() {
  return useApiMutation<
    PlatformPrivacyRequest,
    { requestId: string; status: 'in_progress' | 'rejected'; note?: string },
    ApiError
  >({
    mutationFn: ({ requestId, status, note }) =>
      platformPrivacyRequestService.updateStatus(requestId, { status, note }),
    invalidateKeys: [privacyRequestKeys.all],
    // The card and the page show the error where it happened.
    showErrorToast: false,
  });
}

export function useFulfilPrivacyRequest() {
  return useApiMutation<
    PlatformPrivacyRequest,
    { requestId: string },
    ApiError
  >({
    mutationFn: ({ requestId }) =>
      platformPrivacyRequestService.fulfil(requestId),
    invalidateKeys: [privacyRequestKeys.all],
    // The card and the page show the error where it happened.
    showErrorToast: false,
  });
}
