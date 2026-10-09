/**
 * Academy Customer Request hooks — the academy's own list and detail, and
 * the three things a requester can do: file, reply, cancel.
 *
 * Every mutation invalidates the whole `customerRequestKeys.all` prefix,
 * so the list, the detail and (for an operator who is also looking) the
 * console all re-read the same server state. Feedback (toasts, inline
 * errors) is the screen's job, so the shared toasts are switched off.
 * Mutations are never auto-retried: the create call is idempotent through
 * its `clientRequestId`, but a reply must be visibly resent.
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import { customerRequestKeys } from '@services/query';
import type { ApiError } from '@api';
import type { PaginatedResult } from '@types';
import { customerRequestService } from '../services/CustomerRequestService';
import type {
  CreateCustomerRequestPayload,
  CustomerRequestDetail,
  CustomerRequestListQuery,
  CustomerRequestSummary,
} from '../types/customer-request.types';

export function useCustomerRequests(
  academyId: string | undefined,
  query?: CustomerRequestListQuery
) {
  return useApiQuery<PaginatedResult<CustomerRequestSummary>, ApiError>({
    queryKey: customerRequestKeys.academyList(academyId ?? '', query),
    queryFn: () => customerRequestService.list(academyId ?? '', query),
    enabled: !!academyId,
    placeholderData: keepPreviousData,
    // The team answers at any time: keep the statuses fresh while shown.
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}

export function useCustomerRequest(
  academyId: string | undefined,
  requestId: string | undefined
) {
  return useApiQuery<CustomerRequestDetail, ApiError>({
    queryKey: customerRequestKeys.academyDetail(
      academyId ?? '',
      requestId ?? ''
    ),
    queryFn: () => customerRequestService.get(academyId ?? '', requestId ?? ''),
    enabled: !!academyId && !!requestId,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}

export interface CreateCustomerRequestVariables {
  readonly academyId: string;
  readonly payload: CreateCustomerRequestPayload;
}

export function useCreateCustomerRequest() {
  return useApiMutation<
    CustomerRequestDetail,
    CreateCustomerRequestVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      customerRequestService.create(academyId, payload),
    invalidateKeys: [customerRequestKeys.all],
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export interface ReplyToCustomerRequestVariables {
  readonly academyId: string;
  readonly requestId: string;
  readonly body: string;
}

export function useReplyToCustomerRequest() {
  return useApiMutation<
    CustomerRequestDetail,
    ReplyToCustomerRequestVariables,
    ApiError
  >({
    mutationFn: ({ academyId, requestId, body }) =>
      customerRequestService.reply(academyId, requestId, body),
    invalidateKeys: [customerRequestKeys.all],
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export interface CancelCustomerRequestVariables {
  readonly academyId: string;
  readonly requestId: string;
}

export function useCancelCustomerRequest() {
  return useApiMutation<
    CustomerRequestDetail,
    CancelCustomerRequestVariables,
    ApiError
  >({
    mutationFn: ({ academyId, requestId }) =>
      customerRequestService.cancel(academyId, requestId),
    invalidateKeys: [customerRequestKeys.all],
    showSuccessToast: false,
    showErrorToast: false,
  });
}
