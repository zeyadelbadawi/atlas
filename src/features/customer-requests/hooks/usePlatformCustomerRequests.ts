/**
 * Platform Owner console hooks for Customer Requests: the cross-academy
 * list, the counts strip, the assignee options, one request, the status /
 * assignee update, team messages (reply or internal note) and the routing
 * table.
 *
 * Mutations invalidate the whole `customerRequestKeys.all` prefix so the
 * counts, the rows and the detail never disagree. Feedback is the page's
 * job (a 409 invalid transition reads differently from a closed request).
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import { customerRequestKeys } from '@services/query';
import type { ApiError } from '@api';
import type { PaginatedResult } from '@types';
import { platformCustomerRequestService } from '../services/PlatformCustomerRequestService';
import type {
  CustomerRequestAssigneeOption,
  CustomerRequestCounts,
  CustomerRequestRoutingRule,
  PlatformCustomerRequestDetail,
  PlatformCustomerRequestListQuery,
  PlatformCustomerRequestSummary,
  TeamCustomerRequestMessagePayload,
  UpdatePlatformCustomerRequestPayload,
  UpdateRoutingRulesPayload,
} from '../types/customer-request.types';

export function usePlatformCustomerRequests(
  query?: PlatformCustomerRequestListQuery
) {
  return useApiQuery<PaginatedResult<PlatformCustomerRequestSummary>, ApiError>(
    {
      queryKey: customerRequestKeys.platformList(query),
      queryFn: () => platformCustomerRequestService.list(query),
      placeholderData: keepPreviousData,
      ...LIVE_LIST_QUERY_OPTIONS,
    }
  );
}

export function usePlatformCustomerRequestCounts() {
  return useApiQuery<CustomerRequestCounts, ApiError>({
    queryKey: customerRequestKeys.platformCounts(),
    queryFn: () => platformCustomerRequestService.counts(),
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}

export function usePlatformCustomerRequestAssignees() {
  return useApiQuery<readonly CustomerRequestAssigneeOption[], ApiError>({
    queryKey: customerRequestKeys.platformAssignees(),
    queryFn: () => platformCustomerRequestService.assignees(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlatformCustomerRequest(requestId: string | undefined) {
  return useApiQuery<PlatformCustomerRequestDetail, ApiError>({
    queryKey: customerRequestKeys.platformDetail(requestId ?? ''),
    queryFn: () => platformCustomerRequestService.get(requestId ?? ''),
    enabled: !!requestId,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}

export interface UpdatePlatformCustomerRequestVariables {
  readonly requestId: string;
  readonly payload: UpdatePlatformCustomerRequestPayload;
}

export function useUpdatePlatformCustomerRequest() {
  return useApiMutation<
    PlatformCustomerRequestDetail,
    UpdatePlatformCustomerRequestVariables,
    ApiError
  >({
    mutationFn: ({ requestId, payload }) =>
      platformCustomerRequestService.update(requestId, payload),
    invalidateKeys: [customerRequestKeys.all],
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export interface PostTeamCustomerRequestMessageVariables {
  readonly requestId: string;
  readonly payload: TeamCustomerRequestMessagePayload;
}

export function usePostTeamCustomerRequestMessage() {
  return useApiMutation<
    PlatformCustomerRequestDetail,
    PostTeamCustomerRequestMessageVariables,
    ApiError
  >({
    mutationFn: ({ requestId, payload }) =>
      platformCustomerRequestService.message(requestId, payload),
    invalidateKeys: [customerRequestKeys.all],
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export function useCustomerRequestRouting() {
  return useApiQuery<readonly CustomerRequestRoutingRule[], ApiError>({
    queryKey: customerRequestKeys.routing(),
    queryFn: () => platformCustomerRequestService.routing(),
  });
}

export function useUpdateCustomerRequestRouting() {
  return useApiMutation<
    readonly CustomerRequestRoutingRule[],
    UpdateRoutingRulesPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      platformCustomerRequestService.updateRouting(payload),
    invalidateKeys: [customerRequestKeys.routing()],
    showSuccessToast: false,
    showErrorToast: false,
  });
}
